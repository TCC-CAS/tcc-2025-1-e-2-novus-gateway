CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at" DESC);
CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at" DESC);
