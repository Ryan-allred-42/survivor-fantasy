-- Grant admin access to ryanallred42@gmail.com
UPDATE survivor_profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'ryanallred42@gmail.com');
