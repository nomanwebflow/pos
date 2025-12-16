# POS Multi-Tenant Application Context for AI Agents

## Project Overview
**Name**: `pos-multi-tenant-v1`
**Purpose**: A multi-tenant Point of Sale (POS) system built for various businesses (retail, service).
**Cloud Provider**: Google Cloud Platform (Region: `europe-west1`)
**Project ID**: `pos-demo-1765457989`
**Database**: Supabase (Project ID: `itunvqltlahxmnavdosh`)

## Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database/Auth**: Supabase (PostgreSQL)
- **Deployment**: Google Cloud Run (Containerized)
- **State Management**: React State / Server Components

## Database & Architecture
This is a **multi-tenant** system. Tenant isolation implies:
- **`businessId`**: Almost every table (`Product`, `Sale`, `User`) has this column to link data to a specific store.
- **Roles**:
  - `SUPER_ADMIN`: System-wide access.
  - `OWNER`: Business-level admin. Has full access to their business data.
  - `CASHIER`: Limited access (POS, Transactions, Refunds). **No sidebar navigation**.
  - `STOCK_MANAGER`: Inventory management access.

### Key RLS Policies
- **Storage**: `product-images` bucket.
  - `SELECT`: Public.
  - `INSERT/UPDATE/DELETE`: Authenticated users.
- **Tables**: Most tables use RLS to ensure a user only interacts with rows matching their `businessId` (via `get_auth_business_id()` helper or check).
- **API Pattern**: Use `createClient()` (cookies) for standard requests. Use `createAdminClient()` (Service Role) only when strict RLS prevents necessary valid operations (e.g., Cashier viewing `SaleItem` details for a refund).

## Deployment Instructions (Google Cloud Run)
To deploy the latest version:
```bash
gcloud run deploy pos \
  --source . \
  --region europe-west1 \
  --project pos-demo-1765457989 \
  --allow-unauthenticated
```
*Note: The service allows unauthenticated access because Auth is handled at the application level via Supabase.*

## Important Directories
- `/app`: App Router pages and layouts.
- `/app/api`: Backend API routes (Supabase interactions).
- `/components`: Reusable UI components.
- `/lib/supabase`: Supabase user clients (`client.ts`, `server.ts`).
- `/scripts`: Setup scripts (e.g., storage setup).

## Recent Feature Implementations (Dec 2025)
1.  **Product Images**:
    - Users can upload images for products.
    - Stored in Supabase Storage (`product-images`).
    - Displayed in Product List and POS Grid.
    - POS Grid uses `aspect-square`.
2.  **Refunds**:
    - Full refund flow implemented (`RefundDialog`).
    - Dedicated `Refund` and `RefundItem` tables.
    - Cashiers have a simplified view for processing refunds.
3.  **Cashier Experience**:
    - **No Sidebar**: To prevent distraction and layout shifts.
    - **Logout**: Dedicated button in header.
    - **POS Access**: "Back to POS" button.

## Pending/Future Work
- **Refund Policy Settings**: Phase 4 items in `task.md`. Configure refund time limits/rules in Settings page.
- **Inventory Tracking**: Ensure stock decrements/increments correctly on Sales/Refunds (Logic exists, verify edge cases).

## Development Tips
- **Linting**: Be mindful of unused imports (e.g., `RotateCcw`).
- **Icons**: Use `lucide-react`.
- **API**: When fetching joined data (e.g., `Sale` + `SaleItem`), ensure Permissions allow it. If RLS blocks it but the logic is sound, use Service Role.
