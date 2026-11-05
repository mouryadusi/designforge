import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(), ownerId: text("owner_id").notNull(), name: text("name").notNull(), spec: jsonb("spec").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const projectVersions = pgTable("project_versions", {
  id: uuid("id").primaryKey().defaultRandom(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(), spec: jsonb("spec").notNull(), createdAt: timestamp("created_at").defaultNow().notNull(),
});
