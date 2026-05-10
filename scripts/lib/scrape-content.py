#!/usr/bin/env python3
"""
Fetches a URL and returns clean semantic HTML extracted from the <main> tag.
Usage: python3 scrape-content.py <url>
"""
import sys
import re
import urllib.request
from html.parser import HTMLParser


class ContentExtractor(HTMLParser):
    KEEP = {'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'}
    SKIP = {'script', 'style', 'noscript', 'svg', 'nav', 'header', 'footer'}

    def __init__(self):
        super().__init__()
        self.in_main = False
        self.depth = 0
        self.main_depth = 0
        self.skip_stack = []
        self.output = []

    def handle_starttag(self, tag, attrs):
        self.depth += 1
        if tag == 'main':
            self.in_main = True
            self.main_depth = self.depth
            return
        if not self.in_main:
            return
        if tag in self.SKIP:
            self.skip_stack.append(self.depth)
            return
        if self.skip_stack:
            return
        if tag in self.KEEP:
            attr_str = ''
            if tag == 'a':
                href = dict(attrs).get('href', '')
                if href and not href.startswith('#') and not href.startswith('javascript'):
                    attr_str = f' href="{href}"'
            if tag == 'br':
                self.output.append('<br>')
            else:
                self.output.append(f'<{tag}{attr_str}>')

    def handle_endtag(self, tag):
        if self.in_main and self.skip_stack and self.depth == self.skip_stack[-1]:
            self.skip_stack.pop()
        elif self.in_main and not self.skip_stack and tag in self.KEEP and tag != 'br':
            self.output.append(f'</{tag}>')
        if tag == 'main' and self.in_main:
            self.in_main = False
        self.depth -= 1

    def handle_data(self, data):
        if self.in_main and not self.skip_stack and data.strip():
            self.output.append(data)

    def result(self):
        html = ''.join(self.output)
        # Remove empty tags
        html = re.sub(r'<(p|li|h[1-6]|td|th)>\s*</', r'<\1></', html)
        html = re.sub(r'<(p|li|h[1-6]|td|th)></\1>', '', html)
        # Collapse whitespace
        html = re.sub(r'[ \t]+', ' ', html)
        html = re.sub(r'\n{3,}', '\n\n', html)
        return html.strip()


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; LH-migration/1.0)'})
    with urllib.request.urlopen(req, timeout=15) as res:
        return res.read().decode('utf-8', errors='replace')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: scrape-content.py <url>', file=sys.stderr)
        sys.exit(1)
    url = sys.argv[1]
    try:
        html = fetch(url)
        extractor = ContentExtractor()
        extractor.feed(html)
        print(extractor.result())
    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)
