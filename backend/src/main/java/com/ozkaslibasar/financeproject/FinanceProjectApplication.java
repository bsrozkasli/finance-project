package com.ozkaslibasar.financeproject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.EnableScheduling;
import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
@EnableFeignClients
@EnableScheduling
public class FinanceProjectApplication {

    public static void main(String[] args) {
        Dotenv dotenv = Dotenv.load();

        System.setProperty("DB_HOST", dotenv.get("DB_HOST"));
        System.setProperty("DB_PORT", dotenv.get("DB_PORT"));
        System.setProperty("DB_NAME", dotenv.get("DB_NAME"));
        System.setProperty("DB_USERNAME", dotenv.get("DB_USERNAME"));
        System.setProperty("DB_PASSWORD", dotenv.get("DB_PASSWORD"));
        System.setProperty("REDIS_HOST", dotenv.get("REDIS_HOST"));
        System.setProperty("REDIS_PORT", dotenv.get("REDIS_PORT"));
        // FMP_API_KEY removed — FMP integration has been fully removed.
        if (dotenv.get("TIINGO_API_KEY") != null) {
            System.setProperty("TIINGO_API_KEY", dotenv.get("TIINGO_API_KEY"));
        }
        if (dotenv.get("FINNHUB_API_KEY") != null) {
            System.setProperty("FINNHUB_API_KEY", dotenv.get("FINNHUB_API_KEY"));
        }
        if (dotenv.get("DATA_SERVICE_URL") != null) {
            System.setProperty("DATA_SERVICE_URL", dotenv.get("DATA_SERVICE_URL"));
        }

        System.out.println("PROP USERNAME = " + System.getProperty("DB_USERNAME"));
        System.out.println("ENV USERNAME  = " + System.getenv("DB_USERNAME"));

        System.out.println("PROP PASSWORD = " + System.getProperty("DB_PASSWORD"));
        System.out.println("ENV PASSWORD  = " + System.getenv("DB_PASSWORD"));
        SpringApplication.run(FinanceProjectApplication.class, args);

    }



}

