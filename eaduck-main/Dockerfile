# Use an OpenJDK runtime as a parent image
FROM openjdk:17-alpine3.14

# Set the working directory
WORKDIR /app

# Copy the packaged JAR file into the container
COPY target/backend-0.0.1-SNAPSHOT.jar /app/backend-0.0.1-SNAPSHOT.jar

# Expose the port that your Spring Boot application uses
EXPOSE 8080

# Command to run the Spring Boot application
CMD ["java", "-jar", "backend-0.0.1-SNAPSHOT.jar"]
