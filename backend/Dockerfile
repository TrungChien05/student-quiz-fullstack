# Use Maven image with JDK 17 to build the project
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Build the application
RUN mvn clean package -DskipTests

# Use JDK 17 slim image for runtime
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
# Copy the built jar from the build stage
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
# Expose port 8080
EXPOSE 8080
# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
