-- Local demo fixtures. Password for both users: password123
-- Email confirm is auto-handled for local auth; these rows match Supabase GoTrue shape.

create extension if not exists "pgcrypto";

-- Fixed UUIDs so seed media rows stay stable across resets.
do $$
declare
  demo_user_id uuid := '11111111-1111-1111-1111-111111111111';
  alt_user_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  values
    (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated',
      'authenticated',
      'demo@media-list.local',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Demo Viewer"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      alt_user_id,
      'authenticated',
      'authenticated',
      'alt@media-list.local',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Alt Viewer"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    )
  on conflict (id) do nothing;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values
    (
      demo_user_id,
      demo_user_id,
      format('{"sub":"%s","email":"demo@media-list.local"}', demo_user_id)::jsonb,
      'email',
      demo_user_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      alt_user_id,
      alt_user_id,
      format('{"sub":"%s","email":"alt@media-list.local"}', alt_user_id)::jsonb,
      'email',
      alt_user_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    )
  on conflict (provider, provider_id) do nothing;

  insert into public.media_items (
    id,
    user_id,
    media_type,
    canonical_title,
    year,
    genre,
    poster_url,
    source_ratings,
    source_urls,
    user_rating,
    comments
  )
  values
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      demo_user_id,
      'movie',
      'Spirited Away',
      2001,
      'Animation, Adventure, Family',
      'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
      '{"imdb":8.6,"tmdb":8.5}'::jsonb,
      '{"imdb":"https://www.imdb.com/title/tt0245429/","tmdb":"https://www.themoviedb.org/movie/129"}'::jsonb,
      9.5,
      'Comfort rewatch. Score still hits.'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      demo_user_id,
      'tv',
      'The Bear',
      2022,
      'Comedy, Drama',
      'https://image.tmdb.org/t/p/w500/sHFlbKS3WLqMnp9t2ghADCIJCCP.jpg',
      '{"imdb":8.5,"tmdb":8.2}'::jsonb,
      '{"imdb":"https://www.imdb.com/title/tt14452776/","tmdb":"https://www.themoviedb.org/tv/136315"}'::jsonb,
      8.0,
      'Season 2 peak chaos kitchen energy.'
    ),
    (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      demo_user_id,
      'asian_drama',
      'Crash Landing on You',
      2019,
      'Romance, Comedy, Drama',
      'https://image.tmdb.org/t/p/w500/5ehEEvP2U7sYJHhXZGfFqWc5z5.jpg',
      '{"imdb":8.7,"tmdb":8.4}'::jsonb,
      '{"imdb":"https://www.imdb.com/title/tt10850932/","tmdb":"https://www.themoviedb.org/tv/96147"}'::jsonb,
      9.0,
      'Parachute meet-cute forever.'
    ),
    (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      demo_user_id,
      'anime',
      'Frieren: Beyond Journey''s End',
      2023,
      'Adventure, Drama, Fantasy',
      'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',
      '{"mal":9.0,"anidb":8.8}'::jsonb,
      '{"mal":"https://myanimelist.net/anime/52991","anidb":"https://anidb.net/anime/17601"}'::jsonb,
      9.2,
      'Quiet magic; seed item for anime list path.'
    ),
    (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      alt_user_id,
      'movie',
      'Past Lives',
      2023,
      'Drama, Romance',
      'https://image.tmdb.org/t/p/w500/k3mW4qfJo6SKqe6laNyeymQAvw.jpg',
      '{"imdb":7.8,"tmdb":7.8}'::jsonb,
      '{"imdb":"https://www.imdb.com/title/tt13223398/","tmdb":"https://www.themoviedb.org/movie/666277"}'::jsonb,
      8.5,
      'Belongs to alt user — should not appear for demo login.'
    )
  on conflict (id) do nothing;
end $$;
