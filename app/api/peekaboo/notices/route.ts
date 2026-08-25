import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const MASTER_PASSWORD = process.env.NEXT_PUBLIC_PEEKABOO_NOTICE_PASSWORD;
console.log("MAST>>",MASTER_PASSWORD);
export async function POST(request: Request) {
  try {
    const { title, content, password } = await request.json();
    console.log(password, MASTER_PASSWORD);
    if (password !== MASTER_PASSWORD) {
      return NextResponse.json({ error: '마스터 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('peekaboo_notices')
      .insert([{ title, content }]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, title, content, password } = await request.json();
console.log(password, MASTER_PASSWORD);
    if (password !== MASTER_PASSWORD) {
      return NextResponse.json({ error: '마스터 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('peekaboo_notices')
      .update({ title, content })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, password } = await request.json();
console.log(password, MASTER_PASSWORD);
    if (password !== MASTER_PASSWORD) {
      return NextResponse.json({ error: '마스터 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('peekaboo_notices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}