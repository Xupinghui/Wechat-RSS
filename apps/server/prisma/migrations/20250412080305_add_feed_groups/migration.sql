-- CreateTable
CREATE TABLE "feed_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "feed_to_groups" (
    "feed_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("feed_id", "group_id"),
    CONSTRAINT "feed_to_groups_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "feed_to_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "feed_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
