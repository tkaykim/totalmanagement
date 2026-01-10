'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const search = searchParams.get('search');
    const entityType = searchParams.get('entity_type');

    let query = supabase
      .from('partner_categories')
      .select('id, name, name_ko, entity_types')
      .order('name_ko', { ascending: true });

    if (search) {
      const searchPattern = `%${search}%`;
      query = query.or(`name.ilike.${searchPattern},name_ko.ilike.${searchPattern}`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by entity_type if specified
    let filteredData = data || [];
    if (entityType) {
      filteredData = filteredData.filter((cat: any) => 
        cat.entity_types?.includes(entityType)
      );
    }

    return NextResponse.json(filteredData);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Check if category already exists
    const { data: existing } = await supabase
      .from('partner_categories')
      .select('id')
      .eq('name', body.name)
      .single();

    if (existing) {
      return NextResponse.json(existing);
    }

    // Create new category
    const { data, error } = await supabase
      .from('partner_categories')
      .insert({
        name: body.name,
        name_ko: body.name_ko || body.name,
        entity_types: body.entity_types || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
