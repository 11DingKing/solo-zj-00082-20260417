import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [bookmarks, setBookmarks] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookmarks();
    fetchTags();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const response = await fetch(`${API_URL}/bookmarks`);
      const data = await response.json();
      setBookmarks(data);
    } catch (err) {
      setError('Failed to fetch bookmarks');
      console.error(err);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch(`${API_URL}/tags`);
      const data = await response.json();
      setTags(data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const filteredBookmarks = selectedTag
    ? bookmarks.filter(bookmark => 
        bookmark.tags && bookmark.tags.includes(selectedTag)
      )
    : bookmarks;

  const handleTagClick = (tag) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const handleAddBookmark = () => {
    setEditingBookmark(null);
    setFormData({ url: '', title: '', tags: [] });
    setShowModal(true);
  };

  const handleEditBookmark = (bookmark) => {
    setEditingBookmark(bookmark);
    setFormData({
      url: bookmark.url,
      title: bookmark.title,
      tags: bookmark.tags || []
    });
    setShowModal(true);
  };

  const handleDeleteBookmark = async (id) => {
    if (!window.confirm('确定要删除这个书签吗？')) return;
    
    try {
      const response = await fetch(`${API_URL}/bookmarks/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setBookmarks(bookmarks.filter(b => b.id !== id));
      } else {
        setError('Failed to delete bookmark');
      }
    } catch (err) {
      setError('Failed to delete bookmark');
      console.error(err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTagToForm = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTagFromForm = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingBookmark
        ? `${API_URL}/bookmarks/${editingBookmark.id}`
        : `${API_URL}/bookmarks`;
      
      const method = editingBookmark ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (editingBookmark) {
          setBookmarks(bookmarks.map(b => b.id === result.id ? result : b));
        } else {
          setBookmarks([result, ...bookmarks]);
        }
        
        setShowModal(false);
        setFormData({ url: '', title: '', tags: [] });
      } else {
        const errorData = await response.json();
        setError(errorData.error || '操作失败');
      }
    } catch (err) {
      setError('操作失败，请稍后重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const allTags = [...new Set([
    ...tags.map(t => t.name),
    ...bookmarks.flatMap(b => b.tags || [])
  ])].sort();

  return (
    <div className="app">
      <header className="app-header">
        <h1>书签管理器</h1>
        <button className="add-button" onClick={handleAddBookmark}>
          + 添加书签
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="tag-filter">
        <span className="filter-label">筛选标签：</span>
        <div className="tag-list">
          <button
            className={`tag ${selectedTag === null ? 'active' : ''}`}
            onClick={() => setSelectedTag(null)}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`tag ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="bookmarks-grid">
        {filteredBookmarks.length === 0 ? (
          <div className="empty-state">
            <p>暂无书签</p>
            <button className="add-button" onClick={handleAddBookmark}>
              添加第一个书签
            </button>
          </div>
        ) : (
          filteredBookmarks.map(bookmark => (
            <div key={bookmark.id} className="bookmark-card">
              <div className="card-header">
                <h3 className="card-title">{bookmark.title}</h3>
                <div className="card-actions">
                  <button
                    className="action-button edit"
                    onClick={() => handleEditBookmark(bookmark)}
                    title="编辑"
                  >
                    编辑
                  </button>
                  <button
                    className="action-button delete"
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-url"
              >
                {bookmark.url}
              </a>
              {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="card-tags">
                  {bookmark.tags.map(tag => (
                    <span
                      key={tag}
                      className="card-tag"
                      onClick={() => handleTagClick(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="card-footer">
                <span className="card-date">
                  创建于: {new Date(bookmark.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBookmark ? '编辑书签' : '添加书签'}</h2>
              <button
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="title">标题 *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="输入书签标题"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="url">URL *</label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleFormChange}
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>标签</label>
                <div className="tag-input-container">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTagToForm())}
                    placeholder="输入标签名称，按回车添加"
                  />
                  <button
                    type="button"
                    className="add-tag-button"
                    onClick={handleAddTagToForm}
                  >
                    添加
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="selected-tags">
                    {formData.tags.map(tag => (
                      <span key={tag} className="selected-tag">
                        {tag}
                        <button
                          type="button"
                          className="remove-tag"
                          onClick={() => handleRemoveTagFromForm(tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? '保存中...' : (editingBookmark ? '保存修改' : '添加书签')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;