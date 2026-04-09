-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable update for business owners" ON "public"."products";
DROP POLICY IF EXISTS "Enable delete for business owners" ON "public"."products";

-- Drop new policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Enable update for business admins and owners" ON "public"."products";
DROP POLICY IF EXISTS "Enable delete for business admins and owners" ON "public"."products";

-- Create new inclusive policies that allow both Owners and Admins to Update/Delete
CREATE POLICY "Enable update for business admins and owners" ON "public"."products"
FOR UPDATE USING (
  auth.uid() IN (
    SELECT businesses.owner_id FROM businesses WHERE businesses.id = products.business_id
  ) OR 
  auth.uid() IN (
    SELECT user_roles.user_id 
    FROM user_roles 
    WHERE user_roles.business_id = products.business_id 
    AND user_roles.role IN ('admin', 'store_owner', 'Owner')
  )
) WITH CHECK (
  auth.uid() IN (
    SELECT businesses.owner_id FROM businesses WHERE businesses.id = products.business_id
  ) OR 
  auth.uid() IN (
    SELECT user_roles.user_id 
    FROM user_roles 
    WHERE user_roles.business_id = products.business_id 
    AND user_roles.role IN ('admin', 'store_owner', 'Owner')
  )
);

CREATE POLICY "Enable delete for business admins and owners" ON "public"."products"
FOR DELETE USING (
  auth.uid() IN (
    SELECT businesses.owner_id FROM businesses WHERE businesses.id = products.business_id
  ) OR 
  auth.uid() IN (
    SELECT user_roles.user_id 
    FROM user_roles 
    WHERE user_roles.business_id = products.business_id 
    AND user_roles.role IN ('admin', 'store_owner', 'Owner')
  )
);
