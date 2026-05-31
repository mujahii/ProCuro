-- Enable Realtime for reports and halal_certificates so that admin sidebar
-- badge counts update reactively on INSERT/UPDATE/DELETE without a page reload.
-- Previously only chat tables (admin_messages, admin_conversations, messages,
-- conversations) were in the supabase_realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE reports, halal_certificates;
