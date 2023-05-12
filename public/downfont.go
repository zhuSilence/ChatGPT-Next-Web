package main

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
)

func main() {
	const cssPath = "css2.css"
	const fontDir = "fonts"
	const urlPrefix = "https:"

	// 读取 CSS 文件
	cssFile, err := os.Open(cssPath)
	if err != nil {
		panic(fmt.Sprintf("Failed to open %s: %s", cssPath, err))
	}
	defer cssFile.Close()

	// 创建字体存储目录
	if err := os.MkdirAll(fontDir, 0755); err != nil {
		panic(fmt.Sprintf("Failed to create font directory: %s", err))
	}

	// 解析 CSS 文件
	scanner := bufio.NewScanner(cssFile)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "url(") && strings.Contains(line, ".woff2") {
			// 使用正则表达式提取 WOFF2 文件 URL
			re := regexp.MustCompile(`url\(["']?([^"']+\.(woff2))`)
			matches := re.FindStringSubmatch(line)

			if len(matches) >= 2 {
				fontUrl := matches[1]
				if strings.HasPrefix(fontUrl, "//") {
					fontUrl = urlPrefix + fontUrl
				}

				// 下载 WOFF2 文件
				fmt.Printf("Downloading %s...\n", fontUrl)
				res, err := http.Get(fontUrl)
				if err != nil {
					fmt.Printf("Failed to download %s: %s\n", fontUrl, err)
					continue
				}
				defer res.Body.Close()

				index := strings.LastIndex(matches[1], "/")
				filename := matches[1][index+1:]

				// 创建字体文件
				//fmt.Printf("matches:" + filename)
				//fmt.Printf(" matches2:" + matches[2])
				fontPath := fmt.Sprintf("%s/%s", fontDir, filename)
				fontFile, err := os.Create(fontPath)
				if err != nil {
					fmt.Printf("Failed to create font file %s: %s\n", fontPath, err)
					continue
				}
				defer fontFile.Close()

				// 写入字体文件
				_, err = fontFile.ReadFrom(res.Body)
				if err != nil {
					fmt.Printf("Failed to write to font file %s: %s\n", fontPath, err)
				} else {
					fmt.Printf("Font file %s downloaded.\n", fontPath)
				}
			}
		}
	}
}
