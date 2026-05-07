/**
 * RichContent - 将文本中的 [emoji:xxx.jpg] 标记渲染为图片
 */
function RichContent({ text }) {
    if (!text) return null;

    // 用正则分割文本和表情标记以及自定义图片标记
    const parts = text.split(/(\[emoji:[^\]]+\]|\[img:[^\]]+\])/g);

    return (
        <div className="rich-content">
            {parts.map((part, i) => {
                const match = part.match(/^\[emoji:(.+)\]$/);
                if (match) {
                    const filename = match[1];
                    return (
                        <img
                            key={i}
                            src={`/assets/images/imgs/${filename}`}
                            alt={filename.replace('.jpg', '')}
                            className="rich-content-emoji"
                            style={{
                                display: 'inline-block',
                                width: '80px',
                                height: '80px',
                                objectFit: 'cover',
                                verticalAlign: 'middle',
                                margin: '0 4px',
                                borderRadius: '4px',
                            }}
                        />
                    );
                }
                const imgMatch = part.match(/^\[img:(.+)\]$/);
                if (imgMatch) {
                    const url = imgMatch[1];
                    return (
                        <div key={i} className="rich-content-attached-image" style={{ margin: '16px 0' }}>
                            <img
                                src={url}
                                alt="embedded"
                                style={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    maxHeight: '400px',
                                    borderRadius: '8px',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                    );
                }
                // 普通文本，保留换行
                return part.split('\n').map((line, j) => (
                    <span key={`${i}-${j}`}>
                        {j > 0 && <br />}
                        {line}
                    </span>
                ));
            })}
        </div>
    );
}

export default RichContent;
