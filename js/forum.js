document.addEventListener('DOMContentLoaded', function() {
    var postList = [
        { title: '帖子1' },
        { title: '帖子2' },
        { title: '帖子3'},
        // 可以根据需要添加更多帖子数据
    ];
    
    var postListElement = document.getElementById('post-list');
    
    postList.forEach(function(post) {
        var listItem = document.createElement('li');
        listItem.className = 'post-item';
        
        var titleElement = document.createElement('div');
        titleElement.className = 'post-title';
        titleElement.textContent = post.title;
        
        var contentElement = document.createElement('div');
        contentElement.className = 'post-content';
        contentElement.textContent = post.content;
        
        listItem.appendChild(titleElement);
        listItem.appendChild(contentElement);
        postListElement.appendChild(listItem);
    });
});