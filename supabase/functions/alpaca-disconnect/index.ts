/**
 * Alpaca Disconnect Edge Function
 *
 * Handles disconnecting user's Alpaca trading account.
 * Removes the connection from the database (never logs secrets).
 *
 * POST /alpaca-disconnect
 * Response: { success: true }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest, jsonResponse, errorResponse } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(req, 'Missing authorization header', 401);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return errorResponse(req, 'Invalid authentication', 401);
    }

    console.log(`Disconnecting Alpaca for user ${user.id}`);

    // Delete the Alpaca connection for this user
    const { error: deleteError } = await supabase
      .from('exchange_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('exchange', 'alpaca');

    if (deleteError) {
      console.error('Database error:', deleteError);
      return errorResponse(req, 'Failed to disconnect Alpaca', 500);
    }

    console.log(`Successfully disconnected Alpaca for user ${user.id}`);

    return jsonResponse(req, { success: true });
  } catch (error) {
    console.error('Alpaca disconnect error:', error);
    return errorResponse(
      req,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
