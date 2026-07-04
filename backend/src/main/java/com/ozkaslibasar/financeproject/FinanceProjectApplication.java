package com.ozkaslibasar.financeproject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
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
        if (dotenv.get("TIINGO_API_KEY") != null) {
            System.setProperty("TIINGO_API_KEY", dotenv.get("TIINGO_API_KEY"));
        }
        if (dotenv.get("FINNHUB_API_KEY") != null) {
            System.setProperty("FINNHUB_API_KEY", dotenv.get("FINNHUB_API_KEY"));
        }
        if (dotenv.get("DATA_SERVICE_URL") != null) {
            System.setProperty("DATA_SERVICE_URL", dotenv.get("DATA_SERVICE_URL"));
        }
        SpringApplication.run(FinanceProjectApplication.class, args);

    }



}

