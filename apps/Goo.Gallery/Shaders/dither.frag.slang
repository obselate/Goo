#include "goo_effect.slang"

float bayer4(int index)
{
    switch (index)
    {
        case 0: return 0.0;
        case 1: return 8.0 / 16.0;
        case 2: return 2.0 / 16.0;
        case 3: return 10.0 / 16.0;
        case 4: return 12.0 / 16.0;
        case 5: return 4.0 / 16.0;
        case 6: return 14.0 / 16.0;
        case 7: return 6.0 / 16.0;
        case 8: return 3.0 / 16.0;
        case 9: return 11.0 / 16.0;
        case 10: return 1.0 / 16.0;
        case 11: return 9.0 / 16.0;
        case 12: return 15.0 / 16.0;
        case 13: return 7.0 / 16.0;
        case 14: return 13.0 / 16.0;
        default: return 5.0 / 16.0;
    }
}

float bayer8(int index)
{
    switch (index)
    {
        case 0: return 0.0 / 64.0;
        case 1: return 32.0 / 64.0;
        case 2: return 8.0 / 64.0;
        case 3: return 40.0 / 64.0;
        case 4: return 2.0 / 64.0;
        case 5: return 34.0 / 64.0;
        case 6: return 10.0 / 64.0;
        case 7: return 42.0 / 64.0;
        case 8: return 48.0 / 64.0;
        case 9: return 16.0 / 64.0;
        case 10: return 56.0 / 64.0;
        case 11: return 25.0 / 64.0;
        case 12: return 50.0 / 64.0;
        case 13: return 18.0 / 64.0;
        case 14: return 58.0 / 64.0;
        case 15: return 26.0 / 64.0;
        case 16: return 12.0 / 64.0;
        case 17: return 44.0 / 64.0;
        case 18: return 4.0 / 64.0;
        case 19: return 36.0 / 64.0;
        case 20: return 14.0 / 64.0;
        case 21: return 46.0 / 64.0;
        case 22: return 6.0 / 64.0;
        case 23: return 38.0 / 64.0;
        case 24: return 60.0 / 64.0;
        case 25: return 28.0 / 64.0;
        case 26: return 52.0 / 64.0;
        case 27: return 20.0 / 64.0;
        case 28: return 62.0 / 64.0;
        case 29: return 30.0 / 64.0;
        case 30: return 54.0 / 64.0;
        case 31: return 22.0 / 64.0;
        case 32: return 3.0 / 64.0;
        case 33: return 35.0 / 64.0;
        case 34: return 11.0 / 64.0;
        case 35: return 43.0 / 64.0;
        case 36: return 1.0 / 64.0;
        case 37: return 33.0 / 64.0;
        case 38: return 8.0 / 64.0;
        case 39: return 41.0 / 64.0;
        case 40: return 51.0 / 64.0;
        case 41: return 19.0 / 64.0;
        case 42: return 59.0 / 64.0;
        case 43: return 27.0 / 64.0;
        case 44: return 49.0 / 64.0;
        case 45: return 17.0 / 64.0;
        case 46: return 57.0 / 64.0;
        case 47: return 25.0 / 64.0;
        case 48: return 15.0 / 64.0;
        case 49: return 47.0 / 64.0;
        case 50: return 7.0 / 64.0;
        case 51: return 39.0 / 64.0;
        case 52: return 13.0 / 64.0;
        case 53: return 45.0 / 64.0;
        case 54: return 5.0 / 64.0;
        case 55: return 37.0 / 64.0;
        case 56: return 63.0 / 64.0;
        case 57: return 31.0 / 64.0;
        case 58: return 55.0 / 64.0;
        case 59: return 23.0 / 64.0;
        case 60: return 61.0 / 64.0;
        case 61: return 29.0 / 64.0;
        case 62: return 53.0 / 64.0;
        default: return 21.0 / 64.0;
    }
}


float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    GooPrimitiveRecord primitive = gooPrimitive();
    float2 hostSize = max(primitive.rect.zw, float2(1.0, 1.0));
    float2 pixel = floor(uv * hostSize);
    int pixelX = int(pixel.x);
    int pixelY = int(pixel.y);
    float4 controls = gooParameter(2);
    int matrix = int(clamp(floor(controls.x + 0.5), 0.0, 1.0));
    float ordered;
    if (matrix == 0)
    {
        int column = pixelX - (pixelX / 4) * 4;
        int row = pixelY - (pixelY / 4) * 4;
        ordered = bayer4(column + row * 4);
    }
    else
    {
        int column = pixelX - (pixelX / 8) * 8;
        int row = pixelY - (pixelY / 8) * 8;
        ordered = bayer8(column + row * 8);
    }
    float alpha = clamp(source.a, 0.0, 1.0);
    float3 retained = lerp(backdrop.rgb, source.rgb, alpha);
    float3 unpremultiplied = retained / max(alpha, 0.0001);
    float luminance = clamp(dot(unpremultiplied, float3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    float bias = clamp(controls.y - 0.5, -0.5, 0.5);
    float palette = clamp(controls.z, 0.0, 1.0);
    float3 tone;
    if (palette < 0.5)
    {
        float cut = clamp(ordered + bias, 0.0, 1.0);
        tone = luminance >= cut
            ? float3(0.92, 0.93, 0.9)
            : float3(0.015, 0.017, 0.022);
    }
    else
    {
        float orderedLuminance = clamp(luminance + (ordered - 0.5) * 0.28, 0.0, 1.0);
        float lower = clamp(0.34 + bias, 0.0, 1.0);
        float upper = clamp(0.68 + bias, 0.0, 1.0);
        if (orderedLuminance < lower)
        {
            tone = float3(0.015, 0.02, 0.03);
        }
        else if (orderedLuminance < upper)
        {
            tone = float3(0.8, 0.24, 0.08);
        }
        else
        {
            tone = float3(0.94, 0.95, 0.9);
        }
    }
    return float4(tone * alpha, alpha);
}
