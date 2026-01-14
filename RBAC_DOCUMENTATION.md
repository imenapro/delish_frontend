# RBAC System Documentation

## Overview
The Access Control System is a comprehensive Role-Based Access Control (RBAC) implementation with support for hierarchical permissions, user-specific overrides, and dynamic menu generation.

## Core Features
1.  **Dynamic Roles**: Create and manage custom roles with specific permission sets.
2.  **Granular Permissions**: Fine-grained control over system actions (Create, Read, Update, Delete).
3.  **User Overrides**: Grant or Deny specific permissions to individual users, overriding their role-based defaults.
4.  **Dynamic Menus**: Navigation menus are stored in the database and filtered based on user permissions.
5.  **Audit Logging**: All changes to roles, permissions, and assignments are logged.

## Database Schema

### Tables
-   `roles`: Stores role definitions (System and Custom).
-   `permissions`: Stores available system permissions.
-   `role_permissions`: Maps permissions to roles.
-   `user_roles`: Maps users to roles (supports multiple roles per user).
-   `user_permissions`: Stores user-specific permission overrides (Grant/Deny).
-   `menus`: Stores navigation structure and permission requirements.
-   `audit_logs`: Stores history of changes.

### Key Functions
-   `has_permission(_user_id, _permission_code)`: Boolean check for access.
-   `get_user_effective_permissions(_user_id)`: Returns list of all active permissions for a user.
-   `get_user_menus(_user_id)`: Returns the hierarchical menu structure for a user.

## Granular Permissions
The system supports CRUD-level granularity for key modules.

| Module | Permissions |
| :--- | :--- |
| **Staff** | `staff.view`, `staff.create`, `staff.edit`, `staff.delete` |
| **Products** | `products.view`, `products.create`, `products.edit`, `products.delete` |
| **Orders** | `orders.view`, `orders.create`, `orders.edit`, `orders.delete` |
| **Inventory** | `inventory.view`, `inventory.manage` |
| **Shifts** | `shifts.view`, `shifts.manage` |
| **Finance** | `finance.view`, `finance.manage` |

## User Guide

### Managing Roles
1.  Navigate to **Settings > Access Control**.
2.  Select the **Roles & Permissions** tab.
3.  Click **Create Role** to define a new role.
4.  Click the **Pencil Icon** on an existing role to edit its permissions.
5.  Check/Uncheck boxes in the Permission Matrix to assign access.

### Managing Menus
1.  Navigate to **Settings > Access Control**.
2.  Select the **Menu Configuration** tab.
3.  Click **Add Menu Item** to create a new link.
4.  Specify:
    -   **Label**: Display name.
    -   **Path**: URL route (e.g., `/dashboard/orders`).
    -   **Icon**: Lucide icon name.
    -   **Parent**: Nesting capability.
    -   **Permission**: The permission code required to see this item (e.g., `orders.view`).

### Managing User Permissions
1.  Navigate to **Staff Management**.
2.  Click the "Actions" menu for a staff member.
3.  Select **Manage Permissions**.
4.  **Roles Tab**: Assign multiple roles.
5.  **Granular Permissions Tab**: View the final calculated permissions.
    -   Use **Select Dropdown** to explicit Grant or Deny a specific permission for this user.
    -   Status indicators show if access is from Role (Blue), Explicit Grant (Green), or Default Denied.

### Viewing Audit Logs
1.  Navigate to **Settings > Access Control**.
2.  Select the **Audit Logs** tab.
3.  View the history of changes, including who made the change and what data was modified.

## Developer Guide

### Protecting Components
Use the `PermissionGuard` component to conditionally render UI elements:

```tsx
import { PermissionGuard } from '@/components/auth/PermissionGuard';

<PermissionGuard requiredPermission="orders.delete" fallback={<span>Restricted</span>}>
  <DeleteButton />
</PermissionGuard>
```

### Checking Permissions in Hooks
Use the `usePermissions` hook:

```ts
const { hasPermission, hasAllPermissions } = usePermissions();

if (hasPermission('orders.view')) {
  // do something
}
```

### Adding New Permissions
1.  Insert new permission codes into the `permissions` table via SQL migration or Seed data.
    ```sql
    INSERT INTO public.permissions (code, description, module) 
    VALUES ('new.feature', 'Access new feature', 'features');
    ```
2.  Assign to `super_admin` or other roles.
