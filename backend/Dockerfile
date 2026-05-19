FROM python:3.11-slim

WORKDIR /app

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r requirements.txt

# 复制代码
COPY . .

# 预先创建数据目录，防止 SQLite 连接时因目录不存在而报错
RUN mkdir -p /app/data

EXPOSE 80

CMD ["sh", "-c", "gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:80 --workers ${WEB_CONCURRENCY:-4} --threads ${GUNICORN_THREADS:-1} --timeout ${GUNICORN_TIMEOUT:-60} --max-requests ${GUNICORN_MAX_REQUESTS:-1000} --max-requests-jitter ${GUNICORN_MAX_REQUESTS_JITTER:-100} --access-logfile -"]
