// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取回到顶部按钮
    const backToTopButton = document.getElementById('backToTop');
    if (backToTopButton) {
        // 监听滚动事件
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        // 点击回到顶部
        backToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // 资源页面功能
    const resourcesList = document.getElementById('resourcesList');
    const categoryItems = document.querySelectorAll('.category-item');
    const searchInput = document.getElementById('searchInput');

    if (resourcesList && categoryItems.length > 0) {
        let currentCategory = 'all';
        let resources = [];

        // 加载资源数据
        async function loadResources() {
            try {
                let data = [];
                if (currentCategory === 'all') {
                    const categories = ['chinese', 'math', 'english', 'biology', 'geography', 'politics', 'history', 'physics'];
                    for (const category of categories) {
                        try {
                            const response = await fetch(`/api/resources/${category}`);
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            const categoryData = await response.json();
                            data = data.concat(categoryData);
                        } catch (error) {
                            console.error(`加载${category}资源失败:`, error);
                        }
                    }
                } else {
                    const response = await fetch(`/api/resources/${currentCategory}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    data = await response.json();
                }
                resources = data;
                displayResources(resources);
            } catch (error) {
                console.error('加载资源失败:', error);
                displayError();
            }
        }

        // 显示资源列表
        function displayResources(items) {
            if (!items || items.length === 0) {
                resourcesList.innerHTML = '<tr><td colspan="5" style="text-align: center;">暂无资源</td></tr>';
                return;
            }

            // 按时间排序，最新的在前面
            items.sort((a, b) => new Date(b.time) - new Date(a.time));

            resourcesList.innerHTML = items.map(item => `
                <tr>
                    <td>${item.fileName}</td>
                    <td>${getCategoryName(item.category)}</td>
                    <td>${formatDate(item.time)}</td>
                    <td>
                        <a href="${item.downloadUrl}" download class="download-link">下载</a>
                    </td>
                    <td>
                        <button class="delete-button" data-id="${item.id}" onclick="confirmDelete('${item.id}', '${item.fileName}')">删除</button>
                    </td>
                </tr>
            `).join('');
        }

        // 删除确认对话框
        window.confirmDelete = function(id, fileName) {
            if (confirm(`确定要删除文件 "${fileName}" 吗？`)) {
                deleteResource(id);
            }
        }

        // 删除资源
        async function deleteResource(id) {
            try {
                const response = await fetch(`/api/resources/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // 从本地数组中移除被删除的资源
                    resources = resources.filter(item => item.id !== id);
                    // 重新显示资源列表
                    displayResources(resources);
                    alert('删除成功');
                } else {
                    throw new Error(result.error || '删除失败');
                }
            } catch (error) {
                console.error('删除资源失败:', error);
                alert(`删除失败：${error.message}`);
                // 刷新资源列表以确保显示最新状态
                loadResources();
            }
        }

        // 切换分类
        categoryItems.forEach(item => {
            item.addEventListener('click', function() {
                categoryItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                loadResources();
            });
        });

        // 搜索功能
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredResources = resources.filter(item =>
                item.fileName.toLowerCase().includes(searchTerm) ||
                item.category.toLowerCase().includes(searchTerm)
            );
            displayResources(filteredResources);
        });

        // 初始加载全部资源
        loadResources();
    }
});

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 获取分类名称
function getCategoryName(category) {
    const categoryMap = {
        'chinese': '语文',
        'math': '数学',
        'english': '英语',
        'biology': '生物',
        'geography': '地理',
        'politics': '政治',
        'history': '历史',
        'physics': '物理'
    };
    return categoryMap[category] || category;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

// 文件上传功能
const uploadForm = document.getElementById('uploadForm');
if (uploadForm) {
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData();
        const fileInput = document.getElementById('fileInput');
        const category = document.getElementById('category').value;

        if (!fileInput.files[0]) {
            alert('请选择要上传的文件');
            return;
        }

        const fileName = document.getElementById('fileName').value;
        formData.append('file', fileInput.files[0]);
        formData.append('category', category);
        formData.append('fileName', fileName);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('上传成功！');
                window.location.href = 'resources.html';
            } else {
                throw new Error(result.error || '上传失败');
            }
        } catch (error) {
            console.error('上传失败:', error);
            alert('上传失败：' + error.message);
        }
    });
}