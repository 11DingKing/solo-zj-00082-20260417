const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || "me",
  host: process.env.DB_HOST || "db",
  database: process.env.DB_NAME || "api",
  password: process.env.DB_PASSWORD || "root",
  port: process.env.DB_PORT || 5432,
});

app.get("/", (req, res) => {
  res.send("Bookmark API is running!");
});

app.get("/api/bookmarks", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, 
             COALESCE(json_agg(t.name) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
      FROM bookmarks b
      LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/tags", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tags ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/bookmarks", async (req, res) => {
  const { url, title, tags } = req.body;

  if (!url || !title) {
    return res.status(400).json({ error: "URL and title are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bookmarkResult = await client.query(
      "INSERT INTO bookmarks (url, title) VALUES ($1, $2) RETURNING *",
      [url, title],
    );
    const bookmark = bookmarkResult.rows[0];

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagResult = await client.query(
          "INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
          [tagName],
        );
        const tagId = tagResult.rows[0].id;

        await client.query(
          "INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [bookmark.id, tagId],
        );
      }
    }

    await client.query("COMMIT");

    const result = await pool.query(
      `
      SELECT b.*, 
             COALESCE(json_agg(t.name) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
      FROM bookmarks b
      LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      WHERE b.id = $1
      GROUP BY b.id
    `,
      [bookmark.id],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

app.put("/api/bookmarks/:id", async (req, res) => {
  const { id } = req.params;
  const { url, title, tags } = req.body;

  if (!url || !title) {
    return res.status(400).json({ error: "URL and title are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bookmarkResult = await client.query(
      "UPDATE bookmarks SET url = $1, title = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
      [url, title, id],
    );

    if (bookmarkResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bookmark not found" });
    }

    const bookmark = bookmarkResult.rows[0];

    await client.query("DELETE FROM bookmark_tags WHERE bookmark_id = $1", [
      id,
    ]);

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagResult = await client.query(
          "INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
          [tagName],
        );
        const tagId = tagResult.rows[0].id;

        await client.query(
          "INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [bookmark.id, tagId],
        );
      }
    }

    await client.query("COMMIT");

    const result = await pool.query(
      `
      SELECT b.*, 
             COALESCE(json_agg(t.name) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
      FROM bookmarks b
      LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      WHERE b.id = $1
      GROUP BY b.id
    `,
      [id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

app.delete("/api/bookmarks/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM bookmarks WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    res.json({ message: "Bookmark deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
