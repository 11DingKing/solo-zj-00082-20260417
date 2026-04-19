CREATE DATABASE api;
GRANT ALL PRIVILEGES ON DATABASE api TO pern_db;
\c api 

CREATE TABLE users (
  ID SERIAL PRIMARY KEY,
  name VARCHAR(30),
  email VARCHAR(30)
);

INSERT INTO users (name, email)
  VALUES ('Jerry', 'jerry@example.com'), ('George', 'george@example.com');

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookmarks (
  id SERIAL PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookmark_tags (
  id SERIAL PRIMARY KEY,
  bookmark_id INTEGER REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(bookmark_id, tag_id)
);

INSERT INTO tags (name) VALUES ('学习'), ('工作'), ('娱乐'), ('工具');

INSERT INTO bookmarks (url, title) VALUES
  ('https://www.google.com', 'Google 搜索'),
  ('https://www.github.com', 'GitHub 代码仓库'),
  ('https://www.zhihu.com', '知乎问答社区');

INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES
  (1, 4),
  (2, 2),
  (2, 4),
  (3, 1),
  (3, 3);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pern_db;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pern_db;
