import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verify user identity
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Parse request body to check if userId is provided (admin deletion)
    let targetUserId = user.id;
    const body = await req.json().catch(() => ({}));
    
    if (body.userId && body.userId !== user.id) {
      // Check if requesting user is an admin
      const { data: adminRole, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !adminRole) {
        console.error('Not authorized - user is not admin');
        throw new Error('Only admins can delete other users');
      }

      targetUserId = body.userId;
      console.log(`Admin ${user.id} deleting account for user: ${targetUserId}`);
    } else {
      console.log(`User ${user.id} deleting their own account`);
    }

    // Get profile to find files before deletion
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('profile_photo_url, resume_url')
      .eq('id', targetUserId)
      .single();

    // Delete storage files if they exist
    if (profile?.profile_photo_url) {
      const photoPath = profile.profile_photo_url.split('/').pop();
      if (photoPath) {
        await supabaseAdmin.storage
          .from('profile-photos')
          .remove([`${targetUserId}/${photoPath}`])
          .catch(err => console.log('Photo deletion error:', err));
      }
    }

    if (profile?.resume_url) {
      await supabaseAdmin.storage
        .from('resumes')
        .remove([profile.resume_url])
        .catch(err => console.log('Resume deletion error:', err));
    }

    // Delete user using admin client (cascades to profile and related data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted user: ${targetUserId}`);

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Error in delete-account function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
