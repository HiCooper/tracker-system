# tracker-service — 事件采集服务
# 构建上下文应为 backend/tracker-service（submodule），Dockerfile 通过 compose 的
# dockerfile 字段引用，构建产物保留在父仓库，避免改动 submodule。

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
# 先拷贝 pom 利用依赖缓存层
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true
COPY src ./src
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0"
COPY --from=build /workspace/target/*-SNAPSHOT.jar app.jar
EXPOSE 8088
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=10 \
  CMD curl -fs http://localhost:8088/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
