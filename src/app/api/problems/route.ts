import { NextRequest, NextResponse } from 'next/server';
import { importLeetCodeProblems, getProblemsStats } from '@/lib/leetcode-import';

export async function POST() {
  try {
    console.log("Starting LeetCode problems import...");
    const result = await importLeetCodeProblems();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${result.imported} problems`,
        data: result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Import API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = await getProblemsStats();
    
    if (stats.success) {
      return NextResponse.json({
        success: true,
        data: stats.stats
      });
    } else {
      return NextResponse.json({
        success: false,
        error: stats.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}