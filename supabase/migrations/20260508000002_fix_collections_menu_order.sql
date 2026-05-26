-- Fix Collections menu order to prevent it from being the default landing page
-- And ensure it is properly nested under Finance if needed, or just moved down.

UPDATE public.menus 
SET sort_order = 105 -- Place it after Finance (100)
WHERE path = 'finance/collections';