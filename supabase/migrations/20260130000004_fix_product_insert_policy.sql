-- Enable insert for business owners and admins
DROP POLICY IF EXISTS "Enable insert for business admins and owners" ON "public"."products";

CREATE POLICY "Enable insert for business admins and owners" ON "public"."products"
FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT businesses.owner_id FROM businesses WHERE businesses.id = business_id
  ) OR 
  auth.uid() IN (
    SELECT user_roles.user_id 
    FROM user_roles 
    WHERE user_roles.business_id = business_id 
    AND user_roles.role IN ('admin', 'store_owner')
  )
);
