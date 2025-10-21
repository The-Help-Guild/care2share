-- ============================================
-- DATA EXPORT FOR CARE2SHARE APPLICATION
-- Generated: 2025-10-21
-- ============================================
-- This file contains all user data and content from the database
-- Run this AFTER running MIGRATION_EXPORT.sql
-- 
-- IMPORTANT: You may need to manually handle auth.users table
-- The auth.users table is managed by Supabase Auth and cannot be directly exported
-- You'll need to manually recreate users or use Supabase migration tools
-- ============================================

-- Disable triggers temporarily for faster inserts
SET session_replication_role = replica;

-- ============================================
-- PROFILES
-- ============================================
INSERT INTO public.profiles (id, full_name, email, bio, profile_photo_url, resume_url, location, latitude, longitude, created_at, updated_at, terms_accepted_at, is_blocked, blocked_at, blocked_by, block_reason) VALUES
('28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'vibedeveloper', 'vibedeveloper@proton.me', 'The owner & creator of this app. Father, employee and developer. Contact me for any questions or suggestions at vibedeveloper@proton.me, or message me here.', 'https://zufjzqrbipbvzqjhougo.supabase.co/storage/v1/object/public/profile-photos/28b47912-bd7b-4b6c-9976-cfed2a0a5f8e/1760207927239_-2130hm.jpg', NULL, '{"address":"Roosendaal, North Brabant, Netherlands","latitude":51.5331,"longitude":4.45677}', NULL, NULL, '2025-10-11 18:38:48.023101+00', '2025-10-18 18:00:50.391114+00', '2025-10-11 18:28:07.969+00', false, NULL, NULL, NULL),
('542c35b5-3a04-4496-a160-133999914bf6', 'zeetasi', 'zeetasii@hotmail.com', NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-14 03:25:58.883439+00', '2025-10-14 03:25:58.883439+00', '2025-10-14 03:25:44.983+00', false, NULL, NULL, NULL),
('69e83ad5-ad86-4886-a08a-6e7656997e95', 'Ricardo Otto', 'contact@thedutchdev.com', '32 year old father', 'https://zufjzqrbipbvzqjhougo.supabase.co/storage/v1/object/public/profile-photos/69e83ad5-ad86-4886-a08a-6e7656997e95/1760432742993_Afbeelding%20van%20WhatsApp%20op%202025-09-12%20om%2011.53.19_7a5d4bfc.jpg', NULL, 'Heerlen', NULL, NULL, '2025-10-14 09:05:41.416433+00', '2025-10-14 09:05:41.416433+00', '2025-10-14 07:40:52.103+00', false, NULL, NULL, NULL),
('2f0cbcaf-3b07-4ee9-9c55-c2ab7ea22206', 'Anton Otto', 'ricardoantongustavotto@gmail.com', 'A software engineer', 'https://zufjzqrbipbvzqjhougo.supabase.co/storage/v1/object/public/profile-photos/2f0cbcaf-3b07-4ee9-9c55-c2ab7ea22206/1760510714620_image.jpg', NULL, 'Cuijk, Nederland', NULL, NULL, '2025-10-15 06:45:15.562761+00', '2025-10-21 16:08:01.715311+00', '2025-10-15 06:44:55.953+00', true, '2025-10-21 16:08:01.684+00', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'idiot')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER ROLES
-- ============================================
INSERT INTO public.user_roles (id, user_id, role, created_by, created_at) VALUES
('b6cd41a5-bd9b-4c04-8983-b43c3bc2bf0e', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'admin', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', '2025-10-11 19:01:25.233452+00'),
('6b982de1-3c5f-4082-8a21-c3ab9ebab009', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'admin', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DOMAINS
-- ============================================
INSERT INTO public.domains (id, name, icon, created_at) VALUES
('6a45bac7-a687-4a02-9789-584f7ca3f794', 'Painting & Decorating', '🖌️', '2025-10-11 16:22:57.064827+00'),
('20f6a47e-244f-4013-93cb-4ddbe58eda39', 'DIY & Home Repair', '🏠', '2025-10-11 16:22:57.064827+00'),
('5b2af08d-1bf9-4d59-9457-f888823410f8', 'Carpentry & Handyman', '🔨', '2025-10-11 16:22:57.064827+00'),
('f048727f-2984-4e55-9b69-000ad417cb39', 'Community & Personal Support', '🤝', '2025-10-11 16:22:57.064827+00'),
('10bf738a-88e6-436c-a1bf-9b9d3cb6a247', 'Elderly Support', '👤✅', '2025-10-11 16:22:57.064827+00'),
('dbbc7fd3-b705-44ff-a54c-6a736c0c3497', 'Automotive Care & Repair', '🚗', '2025-10-11 16:22:57.064827+00'),
('9cecc57d-157b-4a17-9b99-8ac53684b4ef', 'Life Coaching', '❤️', '2025-10-19 13:10:06.560229+00'),
('50e45251-08a4-4475-b322-382d06f7a347', 'Financial Advice', '💵', '2025-10-19 13:10:06.560229+00'),
('17f58d50-ca5f-4170-894d-19084d9cdf30', 'Legal Advice', '⚖️', '2025-10-19 13:10:06.560229+00'),
('1f4249e3-eef0-4306-8cba-30f49ee7a901', 'Graphic Design & Arts', '🎨', '2025-10-19 13:10:06.560229+00'),
('600d23bf-e656-4fe7-a589-a9424d7a33f2', 'Professional Services', '💼', '2025-10-19 13:10:06.560229+00'),
('67ad3246-8f63-4936-83f0-baa8d29430c1', 'Psychology & Mental Wellness', '🧠', '2025-10-19 13:10:06.560229+00'),
('6f0152e8-4d8a-488c-82b6-89540ac0cf5f', 'Spirituality & Mindfulness', '✨', '2025-10-19 13:10:06.560229+00'),
('d508acd3-1dde-49d8-8c93-9dd4def78eb6', 'IT / Software Development', '💻', '2025-10-19 13:10:06.560229+00'),
('34ff338c-50eb-4c4b-a560-cb92589b3964', 'Cybersecurity', '🛡️', '2025-10-19 13:10:06.560229+00'),
('fc4f6a52-74aa-4b4f-b7f7-1f3c7db833fe', 'Leadership Coaching', '👥', '2025-10-19 13:10:06.560229+00'),
('d78bcbcb-8e8f-42c4-9bca-e90a3acec756', 'Tech Help for Seniors', '📱', '2025-10-19 13:19:46.482488+00'),
('d2933736-7d12-4576-834e-efe4414fb737', 'Transportation Assistance', '🚌', '2025-10-19 13:19:46.482488+00'),
('ecaffaa7-9703-4c15-995a-b87f999099c6', 'Tutoring & Education', '📚', '2025-10-19 13:19:46.482488+00'),
('78de3673-cd85-4dfd-8efc-7fba7f40f311', 'Skilled Trades & Home Services', '🔧', '2025-10-19 13:19:46.482488+00'),
('8f03a482-505e-4a38-b5ca-196d44dd82f7', 'Plumbing & Electrical', '🔌', '2025-10-19 13:19:46.482488+00'),
('89fdba9d-7f31-459f-85ea-f5e321102811', 'HVAC & Appliance Repair', '🌬️', '2025-10-19 13:19:46.482488+00'),
('f816f275-02f1-4e72-aff3-290795f6f64c', 'Health & Fitness Coaching', '💪', '2025-10-19 13:19:46.482488+00'),
('11282b76-f523-496c-b47e-7ec787972aac', 'Grocery & Shopping Aid', '🛒', '2025-10-19 13:19:46.482488+00'),
('7e6b2766-5c6a-450f-b9f3-bd1edb00e9b1', 'Gardening & Landscaping', '🌸', '2025-10-19 13:19:46.482488+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PROFILE DOMAINS
-- ============================================
INSERT INTO public.profile_domains (id, profile_id, domain_id) VALUES
('eca9ffda-b526-4d42-99f2-e61bfc0617fb', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'f048727f-2984-4e55-9b69-000ad417cb39'),
('8fc51ba9-ebf8-4e2f-bf12-a6bb48c9639d', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', '10bf738a-88e6-436c-a1bf-9b9d3cb6a247')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- EXPERTISE TAGS
-- ============================================
INSERT INTO public.expertise_tags (id, profile_id, tag, created_at) VALUES
('c28dcc4e-55f0-4bdf-8a17-5eeb0fe9317c', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'Software Development', '2025-10-14 09:05:41.732927+00'),
('23ff8fa1-3774-47a6-9057-8bf014e0aa91', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Psychology', '2025-10-18 18:00:50.903859+00'),
('0e8e9f5f-4800-42a5-aabc-129a562155c7', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Vibe Coding', '2025-10-18 18:00:50.903859+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- HOBBY TAGS
-- ============================================
INSERT INTO public.hobby_tags (id, profile_id, tag, created_at) VALUES
('4a8bbea7-f732-4b35-8319-2044bce70718', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'Chess', '2025-10-14 09:05:41.830331+00'),
('ae0abfc1-bd5d-44a5-8213-8d5661e78b08', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Psychology', '2025-10-18 18:00:51.039572+00'),
('ebe13c37-0e84-487b-aad5-abbc2e8fd9e2', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Training', '2025-10-18 18:00:51.039572+00'),
('283148c4-f6ec-47ed-87a1-602deee83435', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Life coaching', '2025-10-18 18:00:51.039572+00'),
('764342bc-d363-4b41-a507-c3dc007f4a8b', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Leadership coaching', '2025-10-18 18:00:51.039572+00'),
('6a7fc015-ea97-4bc6-8704-1e0e8d79af5b', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Software development', '2025-10-18 18:00:51.039572+00'),
('513cf911-7d7a-40d5-9677-efbdb525f5b9', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Spirituality', '2025-10-18 18:00:51.039572+00'),
('9fc22ec2-e3e3-4712-ba6b-a00c679cee2e', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Cybersecurity', '2025-10-18 18:00:51.039572+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- POSTS
-- ============================================
INSERT INTO public.posts (id, user_id, title, content, domain_id, photo_url, youtube_url, created_at, updated_at) VALUES
('b10f91b5-3b45-46e1-917e-2509675eba4a', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'WELCOME TO THE COMMUNITY!', 'Dear User,

Welcome to our community Care2Share!

This concept is made by us for you, to have the necessary virtual space where you can meet the neighbours, you can develop your network, and you can help others, as well as you can get help or support in many different areas and domains. Here everything is free, and it''s the place where to Care means to Share.
Share your experience and your expertise, and get help in return.

For now, it''s just a virtual one; soon, depending on everyone''s availability and involvement, it can be a physical community. 
The main idea of this project is everyone''s hope for a better social life, social status and social wealth. We are here with the common goal of searching for help, while offering help. Communication is the key, and reaching out is the first step. Sharing is carrying. 


Help us help you to become an example for the world that you dream to have. ❤️', NULL, NULL, NULL, '2025-10-12 15:09:39.818186+00', '2025-10-12 15:39:43.694545+00'),
('7d97155b-f2f6-41e1-99c9-80ea64fed00a', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'This is a new post', 'Hello just another test', 'ecaffaa7-9703-4c15-995a-b87f999099c6', NULL, NULL, '2025-10-19 18:00:07.008986+00', '2025-10-19 18:00:07.008986+00'),
('6f1dce66-1b66-4f6f-a93e-093d137596cc', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'I got this but what is it?', 'Random test', NULL, NULL, NULL, '2025-10-21 15:47:10.028194+00', '2025-10-21 15:47:10.028194+00'),
('10065661-cb08-4cd3-b24d-70d59498a690', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'testpost', 'hodeee this is nice', NULL, 'https://zufjzqrbipbvzqjhougo.supabase.co/storage/v1/object/public/post-photos/69e83ad5-ad86-4886-a08a-6e7656997e95/1761061743159.jpg', NULL, '2025-10-21 15:49:02.682179+00', '2025-10-21 15:49:02.682179+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================
INSERT INTO public.comments (id, post_id, user_id, content, created_at, updated_at) VALUES
('5d33b63e-5c8d-40c2-96fb-44197b124ee8', '7d97155b-f2f6-41e1-99c9-80ea64fed00a', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'No!', '2025-10-20 16:58:11.366308+00', '2025-10-20 16:58:11.366308+00'),
('886db183-3bf1-4006-96ae-49aacab2bd97', '10065661-cb08-4cd3-b24d-70d59498a690', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', '🤣', '2025-10-21 18:35:04.960686+00', '2025-10-21 18:35:04.960686+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- POST LIKES
-- ============================================
INSERT INTO public.post_likes (id, post_id, user_id, created_at) VALUES
('0d278404-656f-4e17-9b7c-98996364e644', '7d97155b-f2f6-41e1-99c9-80ea64fed00a', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', '2025-10-20 16:58:14.866984+00'),
('81a40c02-25a5-4142-bac9-fce0bfde4059', '7d97155b-f2f6-41e1-99c9-80ea64fed00a', '69e83ad5-ad86-4886-a08a-6e7656997e95', '2025-10-20 16:58:22.876421+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CONVERSATIONS
-- ============================================
INSERT INTO public.conversations (id, created_at, updated_at) VALUES
('9095baea-3665-4e74-898b-29e595b91706', '2025-10-14 12:50:08.012411+00', '2025-10-20 16:59:20.419231+00'),
('0619df15-6904-458a-b0f2-ba30b086edf6', '2025-10-15 06:46:08.787238+00', '2025-10-16 06:05:14.1983+00'),
('d927df64-e586-4656-82e4-96cf556fe077', '2025-10-18 17:09:26.479651+00', '2025-10-18 17:09:26.479651+00'),
('11bc2612-acd8-4165-83f3-fd2d55c71844', '2025-10-18 17:49:10.344364+00', '2025-10-18 17:49:10.344364+00'),
('092e66bd-b453-49b3-8d55-5e4d0eb1f5a7', '2025-10-18 17:49:10.344654+00', '2025-10-18 17:55:00.172349+00'),
('6d14579f-3424-4b7f-b08c-1f0b87135a38', '2025-10-18 17:57:54.12147+00', '2025-10-18 18:03:21.21059+00'),
('d12aafc4-402e-4999-9b2d-c085fde49a36', '2025-10-18 17:59:01.960847+00', '2025-10-18 17:59:01.960847+00'),
('6e3f9229-0ab9-468a-820f-33b68fbe1ae1', '2025-10-18 17:59:13.56243+00', '2025-10-18 17:59:13.56243+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CONVERSATION PARTICIPANTS
-- ============================================
INSERT INTO public.conversation_participants (id, conversation_id, user_id, joined_at) VALUES
('8ecf9f9b-422e-4443-8410-31d8184633c3', '9095baea-3665-4e74-898b-29e595b91706', '69e83ad5-ad86-4886-a08a-6e7656997e95', '2025-10-14 12:50:08.012411+00'),
('c9be6c2b-958e-4397-b827-2b2eac0c2be4', '9095baea-3665-4e74-898b-29e595b91706', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', '2025-10-14 12:50:08.012411+00'),
('9d82351d-be34-4f00-9fdb-d49b51bcb704', '0619df15-6904-458a-b0f2-ba30b086edf6', '2f0cbcaf-3b07-4ee9-9c55-c2ab7ea22206', '2025-10-15 06:46:08.787238+00'),
('f781156e-0815-46cd-b4a2-64ec9d7f418b', '0619df15-6904-458a-b0f2-ba30b086edf6', '69e83ad5-ad86-4886-a08a-6e7656997e95', '2025-10-15 06:46:08.787238+00'),
('b6495504-f267-40f4-9a52-0ee28a7f92fb', 'd927df64-e586-4656-82e4-96cf556fe077', '69e83ad5-ad86-4886-a08a-6e7656997e95', '2025-10-18 17:09:26.479651+00'),
('8332d4b4-2b8d-44a7-b7b1-57bb23368b9c', 'd927df64-e586-4656-82e4-96cf556fe077', '542c35b5-3a04-4496-a160-133999914bf6', '2025-10-18 17:09:26.479651+00'),
('f2a92dfc-6418-4505-91b2-21480f87342a', '11bc2612-acd8-4165-83f3-fd2d55c71844', '9158c567-f8a5-4a3a-a960-f4838470ee0c', '2025-10-18 17:49:10.344364+00'),
('785a9048-4778-4c40-be52-0ff509ebcf63', '11bc2612-acd8-4165-83f3-fd2d55c71844', '2f0cbcaf-3b07-4ee9-9c55-c2ab7ea22206', '2025-10-18 17:49:10.344364+00'),
('aa9ef495-310b-49dc-bd84-52637c4afecd', '092e66bd-b453-49b3-8d55-5e4d0eb1f5a7', '2f0cbcaf-3b07-4ee9-9c55-c2ab7ea22206', '2025-10-18 17:49:10.344654+00'),
('c1735445-17c2-4ced-b09d-babc251a1802', '092e66bd-b453-49b3-8d55-5e4d0eb1f5a7', '9158c567-f8a5-4a3a-a960-f4838470ee0c', '2025-10-18 17:49:10.344654+00'),
('7c8e665b-b4d8-420a-93f4-5d2b346c3831', '6d14579f-3424-4b7f-b08c-1f0b87135a38', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', '2025-10-18 17:57:54.12147+00'),
('687b74c5-56b6-4172-abda-ecf639678a27', '6d14579f-3424-4b7f-b08c-1f0b87135a38', '9158c567-f8a5-4a3a-a960-f4838470ee0c', '2025-10-18 17:57:54.12147+00'),
('79010bcc-45ef-4e84-81f1-dbcb17b9f397', 'd12aafc4-402e-4999-9b2d-c085fde49a36', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', '2025-10-18 17:59:01.960847+00'),
('c9f48323-16be-4b37-ad4c-85ac9f638d37', 'd12aafc4-402e-4999-9b2d-c085fde49a36', '542c35b5-3a04-4496-a160-133999914bf6', '2025-10-18 17:59:01.960847+00'),
('c7f77a2e-1270-4aea-8c24-df1704498ad7', '6e3f9229-0ab9-468a-820f-33b68fbe1ae1', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', '2025-10-18 17:59:13.56243+00'),
('49b105f0-4391-4ffe-b181-5c3d621b4732', '6e3f9229-0ab9-468a-820f-33b68fbe1ae1', '2f0cbcaf-3b07-4ee9-9c55-c2ab7ea22206', '2025-10-18 17:59:13.56243+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MESSAGES (Sample - truncated for brevity)
-- ============================================
-- Note: There are many messages in the database. Below is a sample.
-- You may want to export all messages or filter by date range.
INSERT INTO public.messages (id, conversation_id, sender_id, content, reply_to_id, read, created_at) VALUES
('9199c51f-4e5a-44f0-9345-3f4ea8e8bc36', '9095baea-3665-4e74-898b-29e595b91706', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'Hey mate!', NULL, true, '2025-10-14 12:50:15.058545+00'),
('5883624a-6b36-41f4-8b9e-65cef445a986', '9095baea-3665-4e74-898b-29e595b91706', '28b47912-bd7b-4b6c-9976-cfed2a0a5f8e', 'Hi!', NULL, true, '2025-10-14 13:10:35.772291+00'),
('2a12c03c-7d85-448b-8d7d-b3bd667f3cd6', '0619df15-6904-458a-b0f2-ba30b086edf6', '2f0cbcaf-3b07-4ee9-9c55-c2ab7ea22206', 'Hey!', NULL, true, '2025-10-15 06:46:12.571226+00')
-- Add more messages as needed...
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUPPORT REQUESTS
-- ============================================
INSERT INTO public.support_requests (id, user_id, title, description, category, status, created_at, updated_at) VALUES
('9c10cdb4-6ed2-4c7b-bb22-943b3aaebd8f', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'Help needed!', 'For an upcoming project I need help with Graphical design and banners for an event! 

There''s ways I can help with software development, cleaning house, or many more things.', 'Creative Projects', 'closed', '2025-10-19 17:27:21.900475+00', '2025-10-19 18:35:37.072678+00'),
('f94a0823-5d6f-4fd8-be5b-b2c07c36b644', '69e83ad5-ad86-4886-a08a-6e7656997e95', 'Test2', 'Test10120102025', 'Advice', 'open', '2025-10-20 10:06:10.864281+00', '2025-10-20 10:06:10.864281+00')
ON CONFLICT (id) DO NOTHING;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ============================================
-- NOTES
-- ============================================
-- 1. AUTH USERS: You'll need to manually recreate users in your Supabase Auth
--    or use Supabase migration tools. The user IDs referenced above are:
--    - 28b47912-bd7b-4b6c-9976-cfed2a0a5f8e (vibedeveloper@proton.me)
--    - 542c35b5-3a04-4496-a160-133999914bf6 (zeetasii@hotmail.com)
--    - 69e83ad5-ad86-4886-a08a-6e7656997e95 (contact@thedutchdev.com)
--    - 2f0cbcaf-3b07-4ee9-9c55-c2ab7ea22206 (ricardoantongustavotto@gmail.com)
--
-- 2. STORAGE: Files in storage buckets (profile-photos, resumes, post-photos)
--    need to be migrated separately. You can download them via the Supabase API
--    and re-upload to your new instance.
--
-- 3. MESSAGES: Only a sample of messages was included. If you need all messages,
--    query the messages table and generate full INSERT statements.
--
-- 4. This export was created with ON CONFLICT DO NOTHING to prevent errors
--    if you run it multiple times.
-- ============================================
