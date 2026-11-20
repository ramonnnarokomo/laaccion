# --- Compilación ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Los tests corren en CI (necesitan Docker para Testcontainers), no al construir la imagen.
RUN mvn -B -ntp package -DskipTests

# --- Ejecución ---
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /app/target/laaccion-backend-*.jar app.jar
USER app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
