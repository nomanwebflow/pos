# Test Accounts

These are the placeholder accounts created for testing the POS system with different roles.

## Quick Reference

### Super Admin Account
```
Email: admin@posystem.local
Password: admin123
Default Page: /reports
```

**Full Permissions:**
- View all reports and analytics
- Manage users (add/remove/edit)
- Export all data
- Manage products and inventory
- Manage customers
- Process checkouts
- View all transactions
- Access system settings
- View payment records

---

### Cashier Account
```
Email: cashier@posystem.local
Password: cashier123
Default Page: /checkout
```

**Limited Permissions:**
- Process checkouts ONLY
- Manage customers (add/edit)
- View customer list

**Cannot Access:**
- Reports
- User management
- Product management
- Transactions history
- Settings
- Payments

---

### Stock Manager Account
```
Email: stock@posystem.local
Password: stock123
Default Page: /products
```

**Limited Permissions:**
- Add/edit/delete products
- Manage inventory levels
- View product catalog

**Cannot Access:**
- Checkouts
- Customers
- Reports
- User management
- Transactions
- Settings
- Payments

---

## Testing the RBAC

### Test 1: Login with Each Role
1. Login with each account
2. Verify you're redirected to the correct default page
3. Check that the navigation only shows authorized pages

### Test 2: Direct URL Access
1. Login as Cashier
2. Try to access `/reports` in the browser
3. Should be redirected to `/checkout` with error message
4. Repeat for other unauthorized routes

### Test 3: API Access
1. Login as Stock Manager
2. Try to access customer data via API
3. Should receive 403 Forbidden or empty data (RLS blocks it)

### Test 4: Super Admin Full Access
1. Login as Super Admin
2. Visit all pages (reports, users, products, customers, etc.)
3. All should be accessible

---

## Changing Passwords (Production)

For production use, change these passwords immediately:

### Via Supabase Dashboard
1. Go to Authentication > Users
2. Find the user
3. Click the three dots > "Send password reset email"
4. User will receive email to set new password

### Via SQL (Admin Only)
```sql
-- This will trigger a password reset email
UPDATE auth.users
SET encrypted_password = NULL
WHERE email = 'user@example.com';
```

---

## Adding New Test Users

If you need more test accounts, use the Supabase dashboard or SQL:

```sql
-- Create a new user (they'll get auto-assigned CASHIER role by default)
-- Then manually update their role if needed

-- Example: Create a new cashier
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  'newcashier@posystem.local',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"name":"New Cashier"}'
);

-- Set role to CASHIER (already default, but being explicit)
UPDATE public.user_profiles
SET role = 'CASHIER'
WHERE id = (SELECT id FROM auth.users WHERE email = 'newcashier@posystem.local');
```

---

## Security Notes

1. These accounts use simple passwords for TESTING ONLY
2. DO NOT use these in production
3. Change all passwords before deploying
4. Consider using randomly generated passwords
5. Enable MFA for super admin accounts in production

---

## Troubleshooting

### Can't login with test account?
- Make sure you ran `supabase start` and the seed file
- Check that the migrations ran successfully
- Verify the user exists in auth.users table

### Getting "unauthorized" errors?
- Check the user's role in user_profiles table
- Verify `is_active` is TRUE
- Check middleware route permissions match your needs

### User has wrong permissions?
- Check the role in user_profiles table
- Update role via Supabase dashboard or SQL
- Clear browser cache and login again
