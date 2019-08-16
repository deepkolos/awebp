# AWebp

animated webp 小工具, 对 libwebp 的简单封装, 提供对 animated webp 相关的常用批处理功能(笨方法)

```shell
> npm i -g awebp
> awebp -h

  -h --help                                                      显示帮助
  -d --dispose [method] [file] [outFile]                         dispose-method: 0 for NONE or 1 for BACKGROUND
  -q --quality [quality] [file] [outFile]                        Specify the compression between 0 and 100
  -e --extract-frame [file] [outDir]                             提取所有帧出来
  -c --compose [frameDir] [outFile] [frameOpt] [loop] [bgColor]          从多个图片合成animated webp, frameOpt与webpmux一致
  -i --info [file]                                               统计duration
  -f --fps [fps] [file] [outFile]                                修改duration, fps更好描述
  -l --loop [loop] [file] [outFile]                              修改loop, 0为无限循环
  -b --bg-color [bgColor] [file] [outFile]                       修改webp背景颜色, A,R,G,B

Examples:
  awebp -d 0 ./test/test.webp                                    // 设置webp每帧的dispose method为0
  awebp -q 60 ./test/test.webp                                   // 设置动图webp压缩率, 提取帧->转png->重新拼接webp
  awebp -e ./test/test.webp frames                               // 提取所有帧出来到frames文件夹
  awebp -c frames out.webp +34+0+0+1+b 1 255,255,255,255         // 从frames文件夹合成webp
  awebp -i ./test/test.webp                                      // 统计出animated webp duration
  awebp -f 60 ./test/test.webp                                   // 修改 animated webp duration (60fps ~= 17)
  awebp -l 3 ./test/test.webp                                    // 修改webp的循环次数为 3 次
  awebp -b 0,0,0,0 ./test/test.webp                              // 修改webp背景颜色
```

# 使用场景

1. ffmpeg 转换出来的 webp 重叠问题, 需要设置 dispose-method 为 BACKGROUND
2. animated webp 压缩

# TODO

1. 兼容其他操作系统
2. 完善 info 命令
3. 命令耗时统计
4. 背景颜色输入兼容更多格式
