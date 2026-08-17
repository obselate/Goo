project('goo-text-native', 'c', version: '1.0.0', default_options: ['c_std=c11', 'warning_level=3'])

freetype_source = get_option('freetype_source')
freetype_build = get_option('freetype_build')
harfbuzz_source = get_option('harfbuzz_source')
harfbuzz_build = get_option('harfbuzz_build')
freetype_library = get_option('freetype_library')
bridge_source = get_option('bridge_source')

shared_library('goo-text-native',
  bridge_source,
    include_directories: [
    include_directories(freetype_source / 'include'),
    include_directories(freetype_build),
    include_directories(harfbuzz_source / 'src'),
    include_directories(harfbuzz_build),
  ],
  c_args: ['-fvisibility=hidden'],
  link_args: [freetype_library],
  install: false)
