-- Create RLS policies for businesses table

-- Allow users to read businesses they own
CREATE POLICY "Users can read their own businesses"
ON businesses
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Allow users to read businesses they have access to through user_roles
CREATE POLICY "Users can read businesses they have access to"
ON businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.business_id = businesses.id
  )
);

-- Allow users to update their own businesses
CREATE POLICY "Users can update their own businesses"
ON businesses
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Allow users to insert businesses (for registration)
CREATE POLICY "Users can create businesses"
ON businesses
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());