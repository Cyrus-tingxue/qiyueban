-- Touqi PostgreSQL baseline. Safe for an existing installation: all objects
-- are created only when absent; no existing rows or columns are removed.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    nickname VARCHAR(255) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    pending_email VARCHAR(255),
    email_verification_code_hash VARCHAR(128),
    email_verification_expires_at TIMESTAMP,
    password_reset_token_hash VARCHAR(128),
    password_reset_expires_at TIMESTAMP,
    avatar VARCHAR(255) NOT NULL DEFAULT '',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_reason VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    icon VARCHAR(255) NOT NULL DEFAULT ''
);

-- 新库需要这些默认分类，否则 posts.category 的外键会阻止首次发帖。
INSERT INTO categories (name, icon) VALUES
    ('讨论', ''),
    ('探灵', ''),
    ('灵异', ''),
    ('求助', ''),
    ('分享', ''),
    ('语c', ''),
    ('OC投稿', '')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    image_url VARCHAR(500),
    category VARCHAR(20) NOT NULL REFERENCES categories(name),
    author_id INTEGER NOT NULL REFERENCES users(id),
    author_name VARCHAR(255) NOT NULL,
    reply_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    is_grave BOOLEAN NOT NULL DEFAULT FALSE,
    grave_at TIMESTAMP,
    grave_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS replies (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id),
    author_name VARCHAR(255) NOT NULL,
    like_count INTEGER NOT NULL DEFAULT 0,
    reply_to_id INTEGER REFERENCES replies(id) ON DELETE SET NULL,
    reply_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reply_to_username VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_post_like UNIQUE (user_id, post_id)
);
CREATE TABLE IF NOT EXISTS reply_likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reply_id INTEGER NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_reply_like UNIQUE (user_id, reply_id)
);
CREATE TABLE IF NOT EXISTS grave_requests (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_name VARCHAR(255) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by_id INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_grave_request_status UNIQUE (post_id, requester_id, status)
);
CREATE TABLE IF NOT EXISTS ip_bans (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(64) NOT NULL UNIQUE,
    reason VARCHAR(500),
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(255),
    sender_avatar VARCHAR(255) NOT NULL DEFAULT '',
    type VARCHAR(32) NOT NULL,
    target_id INTEGER,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMP,
    CONSTRAINT uq_friendship_request_pair UNIQUE (requester_id, addressee_id)
);
CREATE TABLE IF NOT EXISTS chat_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sender_deleted_at TIMESTAMP,
    receiver_deleted_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS group_messages (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS chat_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    invited_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_read_message_id INTEGER REFERENCES group_messages(id) ON DELETE SET NULL,
    CONSTRAINT uq_group_member_pair UNIQUE (group_id, user_id)
);
CREATE TABLE IF NOT EXISTS chat_group_invites (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP,
    CONSTRAINT uq_group_invite_pending UNIQUE (group_id, invitee_id, status)
);
CREATE TABLE IF NOT EXISTS app_versions (
    id SERIAL PRIMARY KEY,
    version_code INTEGER NOT NULL DEFAULT 1,
    version_name VARCHAR(255) NOT NULL DEFAULT '1.0.0',
    download_url VARCHAR(255) NOT NULL DEFAULT '',
    update_log VARCHAR(255) NOT NULL DEFAULT '',
    force_update BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS schema_migrations (
    version BIGINT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT (version) DO NOTHING;

CREATE INDEX IF NOT EXISTS ix_posts_author_created_at ON posts(author_id, created_at);
CREATE INDEX IF NOT EXISTS ix_posts_category_created_at ON posts(category, created_at);
CREATE INDEX IF NOT EXISTS ix_posts_is_grave ON posts(is_grave);
CREATE INDEX IF NOT EXISTS ix_replies_post_created_at ON replies(post_id, created_at);
CREATE INDEX IF NOT EXISTS ix_notifications_receiver_created_at ON notifications(receiver_id, created_at);
CREATE INDEX IF NOT EXISTS ix_notifications_receiver_is_read ON notifications(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_type_target_receiver ON notifications(type, target_id, receiver_id);
CREATE INDEX IF NOT EXISTS ix_messages_sender_receiver_created_at ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS ix_messages_receiver_sender_id ON messages(receiver_id, sender_id, id);
CREATE INDEX IF NOT EXISTS ix_messages_receiver_sender_read_deleted ON messages(receiver_id, sender_id, is_read, receiver_deleted_at);
CREATE INDEX IF NOT EXISTS ix_messages_sender_deleted_at ON messages(sender_deleted_at);
CREATE INDEX IF NOT EXISTS ix_messages_receiver_deleted_at ON messages(receiver_deleted_at);
CREATE INDEX IF NOT EXISTS ix_group_messages_group_created_at ON group_messages(group_id, created_at);
CREATE INDEX IF NOT EXISTS ix_group_messages_group_id_id ON group_messages(group_id, id);
CREATE INDEX IF NOT EXISTS ix_chat_group_members_group_user ON chat_group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS ix_chat_group_members_user_group ON chat_group_members(user_id, group_id);
CREATE INDEX IF NOT EXISTS ix_chat_group_members_last_read_message_id ON chat_group_members(last_read_message_id);
CREATE INDEX IF NOT EXISTS ix_group_invites_invitee_status_created_at ON chat_group_invites(invitee_id, status, created_at);
