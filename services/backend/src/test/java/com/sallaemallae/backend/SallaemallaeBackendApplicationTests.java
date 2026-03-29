package com.sallaemallae.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class SallaemallaeBackendApplicationTests {

	@MockitoBean
	JavaMailSender javaMailSender;

	@MockitoBean
	com.sallaemallae.backend.domain.stock.service.StockPriceDailyRecoveryService stockPriceDailyRecoveryService;

	@Test
	void contextLoads() {
	}

}
