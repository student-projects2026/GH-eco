/**
 * 校园图片分享共享区前端逻辑
 */

(function() {
  'use strict';

  const API_BASE = '';

  let currentUser = null;
  let posts = [];

  // DOM elements
  const authBtn = document.getElementById('auth-btn');
  const communityLoginBtn = document.getElementById('community-login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const guestPrompt = document.getElementById('guest-prompt');
  const userActions = document.getElementById('user-actions');
  const currentUserName = document.getElementById('current-user-name');
  const uploadBtn = document.getElementById('upload-btn');

  const loginModal = document.getElementById('login-modal');
  const loginModalClose = document.getElementById('login-modal-close');
  const loginForm = document.getElementById('login-form');
  const loginPhone = document.getElementById('login-phone');
  const loginCode = document.getElementById('login-code');
  const loginNickname = document.getElementById('login-nickname');
  const nicknameGroup = document.getElementById('nickname-group');
  const sendCodeBtn = document.getElementById('send-code-btn');
  const loginError = document.getElementById('login-error');

  const uploadModal = document.getElementById('upload-modal');
  const uploadModalClose = document.getElementById('upload-modal-close');
  const uploadForm = document.getElementById('upload-form');
  const uploadImage = document.getElementById('upload-image');
  const uploadPreview = document.getElementById('upload-preview');
  const uploadCaption = document.getElementById('upload-caption');
  const uploadError = document.getElementById('upload-error');

  const feedGrid = document.getElementById('feed-grid');
  const feedEmpty = document.getElementById('feed-empty');
  const leaderboardMiniList = document.getElementById('leaderboard-mini-list');
  const rewardsLeaderboardList = document.getElementById('rewards-leaderboard-list');

  // Init
  document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    initEventListeners();
    await loadPosts();
    await loadLeaderboard();
  });

  function initEventListeners() {
    // Auth buttons
    authBtn?.addEventListener('click', () => {
      if (currentUser) {
        logout();
      } else {
        openLoginModal();
      }
    });

    communityLoginBtn?.addEventListener('click', openLoginModal);
    logoutBtn?.addEventListener('click', logout);
    uploadBtn?.addEventListener('click', openUploadModal);

    // Login modal
    loginModalClose?.addEventListener('click', closeLoginModal);
    loginModal?.addEventListener('click', (e) => {
      if (e.target === loginModal) closeLoginModal();
    });

    sendCodeBtn?.addEventListener('click', sendCode);
    loginForm?.addEventListener('submit', handleLogin);
    loginPhone?.addEventListener('input', () => {
      nicknameGroup?.classList.add('hidden');
      loginError.textContent = '';
    });

    // Upload modal
    uploadModalClose?.addEventListener('click', closeUploadModal);
    uploadModal?.addEventListener('click', (e) => {
      if (e.target === uploadModal) closeUploadModal();
    });

    uploadImage?.addEventListener('change', previewUploadImage);
    uploadForm?.addEventListener('submit', handleUpload);

    // ESC close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLoginModal();
        closeUploadModal();
      }
    });
  }

  // Auth
  async function checkAuth() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
    updateAuthUI();
  }

  function updateAuthUI() {
    if (currentUser) {
      authBtn.textContent = '退出';
      currentUserName.textContent = currentUser.nickname;
      guestPrompt.classList.add('hidden');
      userActions.classList.remove('hidden');
    } else {
      authBtn.textContent = '登录';
      guestPrompt.classList.remove('hidden');
      userActions.classList.add('hidden');
    }
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      currentUser = null;
      updateAuthUI();
      await loadPosts();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  // Login modal
  function openLoginModal() {
    loginModal.classList.add('active');
    loginPhone.value = '';
    loginCode.value = '';
    loginNickname.value = '';
    loginError.textContent = '';
    nicknameGroup.classList.add('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLoginModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  async function sendCode() {
    const phone = loginPhone.value.trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      loginError.textContent = '请输入有效的手机号';
      return;
    }

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = '发送中...';

    try {
      const res = await fetch(`${API_BASE}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();

      if (res.ok) {
        loginError.textContent = '验证码已发送';
        startCountdown();
      } else {
        loginError.textContent = data.error || '发送失败';
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '获取验证码';
      }
    } catch (err) {
      loginError.textContent = '网络错误，请重试';
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = '获取验证码';
    }
  }

  function startCountdown() {
    let seconds = 60;
    sendCodeBtn.textContent = `${seconds}s`;
    const timer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(timer);
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '获取验证码';
      } else {
        sendCodeBtn.textContent = `${seconds}s`;
      }
    }, 1000);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const phone = loginPhone.value.trim();
    const code = loginCode.value.trim();
    const nickname = loginNickname.value.trim();

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      loginError.textContent = '请输入有效的手机号';
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      loginError.textContent = '请输入6位验证码';
      return;
    }

    loginError.textContent = '';

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code, nickname })
      });
      const data = await res.json();

      if (res.ok) {
        currentUser = data.user;
        updateAuthUI();
        closeLoginModal();
        await loadPosts();
      } else if (data.requireNickname) {
        nicknameGroup.classList.remove('hidden');
        loginError.textContent = data.error || '请设置昵称';
      } else {
        loginError.textContent = data.error || '登录失败';
      }
    } catch (err) {
      loginError.textContent = '网络错误，请重试';
    }
  }

  // Upload modal
  function openUploadModal() {
    if (!currentUser) {
      openLoginModal();
      return;
    }
    uploadModal.classList.add('active');
    uploadForm.reset();
    uploadPreview.innerHTML = '';
    uploadError.textContent = '';
    document.body.style.overflow = 'hidden';
  }

  function closeUploadModal() {
    uploadModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function previewUploadImage() {
    const file = uploadImage.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadPreview.innerHTML = `<img src="${e.target.result}" alt="预览">`;
    };
    reader.readAsDataURL(file);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!currentUser) {
      uploadError.textContent = '请先登录';
      return;
    }

    const file = uploadImage.files[0];
    if (!file) {
      uploadError.textContent = '请选择一张图片';
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('caption', uploadCaption.value.trim());

    uploadError.textContent = '';
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '发布中...';

    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        closeUploadModal();
        await loadPosts();
        await loadLeaderboard();
      } else {
        uploadError.textContent = data.error || '发布失败';
      }
    } catch (err) {
      uploadError.textContent = '网络错误，请重试';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '发布';
    }
  }

  // Posts
  async function loadPosts() {
    try {
      const res = await fetch(`${API_BASE}/api/posts`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load posts');
      const data = await res.json();
      posts = data.posts || [];
      renderPosts();
    } catch (err) {
      console.error('Load posts failed:', err);
      feedGrid.innerHTML = '<p class="feed-empty">加载失败，请刷新页面重试</p>';
    }
  }

  function renderPosts() {
    if (posts.length === 0) {
      feedGrid.innerHTML = '';
      feedEmpty.classList.remove('hidden');
      return;
    }

    feedEmpty.classList.add('hidden');
    feedGrid.innerHTML = posts.map(post => createPostHTML(post)).join('');

    // Bind like buttons
    feedGrid.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleLike(parseInt(btn.dataset.postId), btn));
    });

    // Bind comment forms
    feedGrid.querySelectorAll('.comment-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const postId = parseInt(form.dataset.postId);
        const input = form.querySelector('.comment-input');
        submitComment(postId, input.value.trim(), form);
      });
    });

    // Update lightbox with community images if available
    if (typeof initLightbox === 'function') {
      initLightbox();
    }
  }

  function createPostHTML(post) {
    const date = new Date(post.createdAt).toLocaleDateString('zh-CN');
    const likeClass = post.likedByMe ? 'liked' : '';
    const likeText = post.likedByMe ? '已赞' : '点赞';
    const comments = post.comments || [];

    return `
      <article class="photo-card reveal" data-post-id="${post.id}">
        <img class="photo-card-image" src="${escapeHtml(post.imageUrl)}" alt="校园照片" loading="lazy">
        <div class="photo-card-content">
          <div class="photo-card-header">
            <span class="photo-card-author">${escapeHtml(post.author)}</span>
            <span class="photo-card-date">${date}</span>
          </div>
          ${post.caption ? `<p class="photo-card-caption"&gt;${escapeHtml(post.caption)}&lt;/p&gt;` : ''}
          <div class="photo-card-actions">
            <button class="photo-card-btn like-btn ${likeClass}" data-post-id="${post.id}" ${!currentUser ? 'title="登录后点赞"' : ''}>
              ❤️ ${likeText} · ${post.likeCount}
            </button>
            <button class="photo-card-btn" disabled title="点击展开评论">
              💬 评论 · ${post.commentCount}
            </button>
          </div>
          <div class="photo-comments">
            <div class="photo-comments-list">
              ${comments.length > 0 ? comments.map(c => `
                <div class="photo-comment">
                  <span class="photo-comment-author">${escapeHtml(c.author)}：</span>
                  <span class="photo-comment-text">${escapeHtml(c.content)}</span>
                </div>
              `).join('') : '<p class="photo-comment-empty"&gt;暂无评论，快来抢沙发～&lt;/p&gt;'}
            </div>
            ${currentUser ? `
              <form class="comment-form" data-post-id="${post.id}">
                <input type="text" class="comment-input" placeholder="写下你的评论..." maxlength="300" required>
                <button type="submit" class="btn btn-primary btn-sm">发送</button>
              </form>
            ` : '<p class="photo-comment-empty"&gt;登录后即可评论&lt;/p&gt;'}
          </div>
        </div>
      </article>
    `;
  }

  async function toggleLike(postId, btn) {
    if (!currentUser) {
      openLoginModal();
      return;
    }

    const isLiked = btn.classList.contains('liked');
    btn.disabled = true;

    try {
      let res;
      if (isLiked) {
        res = await fetch(`${API_BASE}/api/likes/${postId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } else {
        res = await fetch(`${API_BASE}/api/likes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ postId })
        });
      }

      const data = await res.json();
      if (res.ok) {
        btn.classList.toggle('liked', data.liked);
        btn.innerHTML = `${data.liked ? '❤️ 已赞' : '❤️ 点赞'} · ${data.likeCount}`;
        await loadLeaderboard();
      }
    } catch (err) {
      console.error('Like failed:', err);
    } finally {
      btn.disabled = false;
    }
  }

  async function submitComment(postId, content, form) {
    if (!content) return;

    const input = form.querySelector('.comment-input');
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId, content })
      });

      if (res.ok) {
        input.value = '';
        await loadPosts();
      }
    } catch (err) {
      console.error('Comment failed:', err);
    } finally {
      submitBtn.disabled = false;
    }
  }

  // Leaderboard
  async function loadLeaderboard() {
    try {
      const res = await fetch(`${API_BASE}/api/rewards/leaderboard`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      renderLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Load leaderboard failed:', err);
    }
  }

  function renderLeaderboard(leaderboard) {
    const miniHTML = leaderboard.length === 0
      ? '<p class="leaderboard-empty"&gt;暂无数据，快来上传照片吧！&lt;/p&gt;'
      : leaderboard.map(item => `
        <div class="leaderboard-mini-item">
          <span class="leaderboard-mini-rank">${item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}</span>
          <img class="leaderboard-mini-thumb" src="${escapeHtml(item.imageUrl)}" alt="">
          <div class="leaderboard-mini-info">
            <div class="leaderboard-mini-author">${escapeHtml(item.author)}</div>
            <div class="leaderboard-mini-likes">❤️ ${item.likeCount} 赞 · ${item.prizeName}</div>
          </div>
        </div>
      `).join('');

    leaderboardMiniList.innerHTML = miniHTML;

    const fullHTML = leaderboard.length === 0
      ? '<p class="leaderboard-empty"&gt;暂无数据，快去校园分享区上传照片吧！&lt;/p&gt;'
      : leaderboard.map(item => `
        <div class="leaderboard-item">
          <div class="leaderboard-rank">${item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}</div>
          <img class="leaderboard-thumb" src="${escapeHtml(item.imageUrl)}" alt="">
          <div class="leaderboard-info">
            <div class="leaderboard-author">${escapeHtml(item.author)}</div>
            <div class="leaderboard-prize">${item.prizeName}</div>
          </div>
          <div class="leaderboard-likes">❤️ ${item.likeCount}</div>
        </div>
      `).join('');

    rewardsLeaderboardList.innerHTML = fullHTML;
  }

  // Utilities
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
