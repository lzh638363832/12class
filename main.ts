import { Application, Router, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { GitHubAPI, type GitHubConfig } from "./github.ts";

// GitHub配置
const githubConfig: GitHubConfig = {
  token: Deno.env.get("GITHUB_TOKEN") || "",
  owner: Deno.env.get("GITHUB_OWNER") || "",
  repo: Deno.env.get("GITHUB_REPO") || "",
  branch: Deno.env.get("GITHUB_BRANCH") || "main",
};

const github = new GitHubAPI(githubConfig);

const app = new Application();
const router = new Router();

// 配置CORS
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  await next();
});

// 获取特定分类的资源列表
router.get("/api/resources/:category", async (ctx) => {
  const category = ctx.params.category;
  try {
    const jsonPath = join("data", `${category}.json`);
    const jsonContent = await Deno.readTextFile(jsonPath);
    const resources = JSON.parse(jsonContent);
    ctx.response.body = resources;
  } catch (error) {
    console.error(`Error loading ${category} resources:`, error);
    ctx.response.status = 404;
    ctx.response.body = [];
  }
});

// 处理文件上传
router.post("/api/upload", async (ctx) => {
  try {
    const body = ctx.request.body({ type: "form-data" });
    const formData = await body.value.read();
    const file = formData.files?.[0];
    const category = formData.fields.category;
    
    if (!file || !category) {
      throw new Error("Missing file or category");
    }

    // 获取用户输入的文件名和文件扩展名
    const originalFileName = formData.fields.fileName || file.filename;
    const fileExt = file.filename.split('.').pop();
    const fileName = `${originalFileName}.${fileExt}`;
    
    // 确保必要的目录存在
    const uploadDir = "files";
    const dataDir = "data";
    
    for (const dir of [uploadDir, dataDir]) {
      try {
        await Deno.mkdir(dir, { recursive: true });
      } catch (error) {
        if (!(error instanceof Deno.errors.AlreadyExists)) {
          throw error;
        }
      }
    }
    
    // 获取文件内容
    let fileContent: Uint8Array;
    if (file.tempFilePath) {
      fileContent = await Deno.readFile(file.tempFilePath);
      await Deno.remove(file.tempFilePath);
    } else {
      fileContent = await file.content();
    }

    // 上传文件到GitHub
    const githubPath = `files/${fileName}`;
    const uploadResult = await github.uploadFile(
      githubPath,
      fileContent,
      `Upload ${fileName} to ${category} category`
    );

    // 更新JSON数据
    const jsonPath = join(dataDir, `${category}.json`);
    let resources = [];
    try {
      const jsonContent = await Deno.readTextFile(jsonPath);
      resources = JSON.parse(jsonContent);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }

    const newResource = {
      id: crypto.randomUUID(),
      fileName: fileName,
      category: category,
      time: new Date().toISOString(),
      downloadUrl: uploadResult.url
    };

    resources.push(newResource);
    await Deno.writeTextFile(jsonPath, JSON.stringify(resources, null, 4));

    ctx.response.status = 200;
    ctx.response.body = { success: true, resource: newResource };
  } catch (error) {
    console.error("Upload error:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: error.message };
  }
});

// 删除资源
router.delete("/api/resources/:id", async (ctx) => {
  try {
    const id = ctx.params.id;
    let found = false;

    // 遍历所有分类文件查找要删除的资源
    const categories = ['chinese', 'math', 'english', 'biology', 'geography', 'politics', 'history', 'physics'];
    for (const category of categories) {
      const jsonPath = join("data", `${category}.json`);
      try {
        const jsonContent = await Deno.readTextFile(jsonPath);
        let resources = JSON.parse(jsonContent);
        const resourceIndex = resources.findIndex((r: any) => r.id === id);

        if (resourceIndex !== -1) {
          const resource = resources[resourceIndex];
          // 从JSON中移除资源
          resources.splice(resourceIndex, 1);
          await Deno.writeTextFile(jsonPath, JSON.stringify(resources, null, 4));

          // 从GitHub删除文件
          try {
            const githubPath = new URL(resource.downloadUrl).pathname.substring(1);
            await github.deleteFile(githubPath, `Delete ${resource.fileName}`);
          } catch (error) {
            console.error("GitHub文件删除失败:", error);
            // 文件删除失败不影响元数据的删除
          }

          found = true;
          break;
        }
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          console.error(`Error processing ${category}.json:`, error);
        }
      }
    }

    if (!found) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, error: "Resource not found" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: error.message };
  }
});

// 配置静态文件服务
app.use(async (ctx, next) => {
  try {
    await ctx.send({
      root: Deno.cwd(),
      index: "index.html",
    });
  } catch {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });