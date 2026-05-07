import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jcdaovmwmpkflccecsrg.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function linkStaffToShops() {
  const email = 'uwaanto@gmail.com';
  const userId = '63e7fd1a-ee00-40aa-af23-764b012bbc88';
  const businessId = 'fd3e0f65-cdd0-4dff-8af8-48c06810867e'; // Delish Bakery Ltd

  console.log(`Linking ${email} to business ${businessId} and all its shops...`);

  // 1. Get all shops for this business
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('is_active', true);

  if (shopsError) {
    console.error('Error fetching shops:', shopsError.message);
    return;
  }

  console.log(`Found ${shops.length} active shops.`);

  // 2. Clean up existing roles for this user in this business
  console.log('Cleaning up existing roles for this business...');
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('business_id', businessId);

  // 3. Insert global super_admin role (shop_id = null)
  console.log('Assigning global super_admin role...');
  const rolesToInsert = [
    {
      user_id: userId,
      role: 'super_admin',
      business_id: businessId,
      shop_id: null
    }
  ];

  // 4. Also insert for every shop to ensure visibility in all shop-filtered views
  shops.forEach(shop => {
    rolesToInsert.push({
      user_id: userId,
      role: 'super_admin',
      business_id: businessId,
      shop_id: shop.id
    });
  });

  const { error: insertError } = await supabase
    .from('user_roles')
    .insert(rolesToInsert);

  if (insertError) {
    console.error('Error linking user to shops:', insertError.message);
  } else {
    console.log(`Successfully linked user to global business and ${shops.length} shops.`);
  }

  // 5. Ensure profile is updated with one of the shop_ids or null
  await supabase
    .from('profiles')
    .update({ shop_id: null })
    .eq('id', userId);

  console.log('Operation completed.');
}

linkStaffToShops();
