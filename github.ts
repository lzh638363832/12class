interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
}

class GitHubAPI {
  private token: string;
  private owner: string;
  private repo: string;
  private branch: string;
  private baseUrl = "https://api.github.com";

  constructor(config: GitHubConfig) {
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch || "main";
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.token}`,
      "Accept": "application/vnd.github.v3+json",
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    return response;
  }

  async uploadFile(path: string, content: Uint8Array, message: string) {
    try {
      // 首先获取当前文件（如果存在）的SHA
      let sha: string | undefined;
      try {
        const response = await this.request(
          `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`,
        );
        const data = await response.json();
        sha = data.sha;
      } catch (error) {
        // 文件不存在，继续上传
      }

      // 准备请求体
      const body = {
        message,
        branch: this.branch,
        content: btoa(String.fromCharCode.apply(null, [...content])),
        ...(sha ? { sha } : {}),
      };

      // 上传文件
      const response = await this.request(
        `/repos/${this.owner}/${this.repo}/contents/${path}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();
      return {
        sha: data.content.sha,
        url: data.content.download_url,
      };
    } catch (error) {
      console.error("GitHub upload error:", error);
      throw error;
    }
  }

  async deleteFile(path: string, message: string) {
    try {
      // 获取文件的SHA
      const response = await this.request(
        `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`,
      );
      const data = await response.json();
      const sha = data.sha;

      // 删除文件
      await this.request(
        `/repos/${this.owner}/${this.repo}/contents/${path}`,
        {
          method: "DELETE",
          body: JSON.stringify({
            message,
            sha,
            branch: this.branch,
          }),
        },
      );

      return true;
    } catch (error) {
      console.error("GitHub delete error:", error);
      throw error;
    }
  }
}

export type { GitHubConfig };
export { GitHubAPI };