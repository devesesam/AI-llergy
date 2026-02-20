import { NextRequest, NextResponse } from "next/server";
import { interpretCustomAllergy } from "@/lib/interpret-allergy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const result = await interpretCustomAllergy(text);

    return NextResponse.json({
      success: true,
      matchedAllergens: result.matchedAllergens,
      unmatchedText: result.unmatchedText,
      method: result.method,
    });
  } catch (error) {
    console.error("Error interpreting allergy text:", error);
    return NextResponse.json(
      { error: "Failed to interpret text" },
      { status: 500 }
    );
  }
}
