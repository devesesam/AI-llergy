---
name: Mosaic Graphic Design
description: Generate on-brand graphics, social media posts, and visual assets for Mosaic using strict brand guidelines.
---

# Mosaic Graphic Design Skill

This skill allows you to generate visual assets that adhere to the Mosaic Brand Guidelines. It combines AI image generation with programmatic branding (logo overlay).

## Brand Guidelines Summary

### 1. Visual Style & Photography
*   **Keywords**: Natural, Inviting, Authentic, Texture & Detail.
*   **Lighting**: Natural light emphasis, atmospheric.
*   **Subject Matter**:
    *   **Food**: Focus on fresh ingredients, close-ups of texture, "journey of flavours". Avoid artificial/plastic looks.
    *   **Venues**: Clean, presentable, capturing the unique ambiance.
    *   **People**: Candid, warm hospitality.

### 2. Colors
*   **Primary Text/Logo**: Charcoal (`#1E1E1E`)
*   **Backgrounds**: Garlic (Off-white/Cream), Aubergine (Deep Purple)
*   **Accents**: Margaux (Red/Wine), Saffron (Yellow/Gold)
*   **Palette**: Blueberry, Seafoam, Sorbet Cinnamon, Vanilla.
*   **Guidance**: Use "Garlic" or "Aubergine" for backgrounds. Use "Charcoal" for main elements.

### 3. Typography (For Reference)
*   **Headlines**: Bogart Medium (Serif, heavy, characterful)
*   **Body**: Neue Haas Grotesk (Clean Sans Serif)
*   *Note: DALL-E cannot render specific fonts perfectly. Ask for "Bold Serif Headings" or "Clean Sans-Serif Body" in prompts.*

## Instructions

### Step 1: Design the Image Prompt
Construct a DALL-E prompt that incorporates the brand keywords.
*   **Template**: `[Subject Description], professional photography, natural lighting, high texture, authentic look, [Color Palette Ref], style of food magazine editorial.`
*   **Example**: `A rustic wooden table setting with a fresh pasta dish, focusing on the texture of the sauce and herbs. Natural sunlight streaming from the side. Authentic, inviting atmosphere. Colors: Warm creams and deep reds.`

### Step 2: Generate the Image
Use the `generate_image` tool.
*   **Prompt**: use the constructed prompt.
*   **ImageName**: descriptive name (e.g., `mosaic_pasta_dish`).

### Step 3: Apply Branding (Logo Overlay)
After generating the image, you MUST overlay the Mosaic logo for official assets.
1.  Locate the generated image in the artifact directory.
2.  Run the `add_logo.py` script.

```bash
python "skills/graphics_design/scripts/add_logo.py" "<PathToGeneratedImage>" "<PathToOutputImage>"
```

*   **Input Image**: The absolute path of the image you just generated.
*   **Output Image**: Define a new path (e.g., same folder but `_branded.png` suffix).

### Step 4: Present to User
Display the final branded image to the user using the markdown syntax: `![Branded Image](<PathToOutputImage>)`.

## Resources
*   **Logo**: `skills/graphics_design/resources/Mosaic_Logo_Straight_Charcoal.png`
*   **Brand Guidelines**: `skills/graphics_design/resources/BrandGuidelines_Mosaic.pdf`
*   **Script**: `skills/graphics_design/scripts/add_logo.py`
