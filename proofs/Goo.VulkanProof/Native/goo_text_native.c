#include <stdint.h>
#include <limits.h>
#include <freetype/freetype.h>

#if defined(_WIN32)
#define GOO_TEXT_API __declspec(dllexport)
#else
#define GOO_TEXT_API __attribute__((visibility("default")))
#endif

GOO_TEXT_API int32_t goo_ft_new_memory_face(FT_Library library, const uint8_t *file_base, int64_t file_size, int64_t face_index, FT_Face *face)
{
    if (library == NULL || file_base == NULL || face == NULL || file_size <= 0 || file_size > LONG_MAX || face_index < LONG_MIN || face_index > LONG_MAX)
        return -1;
    return (int32_t)FT_New_Memory_Face(library, file_base, (FT_Long)file_size, (FT_Long)face_index, face);
}

GOO_TEXT_API int32_t goo_ft_face_metrics(FT_Face face, uint32_t *units_per_em, int64_t *face_ascender, int64_t *face_descender, int64_t *face_height, int64_t *pixel_ascender, int64_t *pixel_descender, int64_t *pixel_height, int64_t *glyph_count)
{
    if (face == NULL || face->size == NULL || units_per_em == NULL || face_ascender == NULL || face_descender == NULL || face_height == NULL || pixel_ascender == NULL || pixel_descender == NULL || pixel_height == NULL || glyph_count == NULL)
        return -1;
    *units_per_em = (uint32_t)face->units_per_EM;
    *face_ascender = (int64_t)face->ascender;
    *face_descender = (int64_t)face->descender;
    *face_height = (int64_t)face->height;
    *pixel_ascender = (int64_t)face->size->metrics.ascender;
    *pixel_descender = (int64_t)face->size->metrics.descender;
    *pixel_height = (int64_t)face->size->metrics.height;
    *glyph_count = (int64_t)face->num_glyphs;
    return 0;
}
