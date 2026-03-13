package com.sallaemallae.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;

@SpringBootTest
class SallaemallaeBackendApplicationTests {

	@MockBean
	JavaMailSender javaMailSender;

	@Test
	void contextLoads() {
	}

}
