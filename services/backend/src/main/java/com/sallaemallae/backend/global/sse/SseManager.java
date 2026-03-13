package com.sallaemallae.backend.global.sse;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 범용 SSE emitter 관리 컴포넌트.
 * 채널(문자열)별로 emitter를 관리하며, 모든 도메인에서 사용 가능.
 */
@Slf4j
@Component
public class SseManager {

    private final Map<String, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    /** SSE emitter를 해당 채널에 등록 */
    public void addEmitter(String channel, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.computeIfAbsent(
            channel, k -> new CopyOnWriteArrayList<>()
        );
        list.add(emitter);

        emitter.onCompletion(() -> list.remove(emitter));
        emitter.onTimeout(() -> list.remove(emitter));
        emitter.onError(e -> list.remove(emitter));
    }

    /** 단일 emitter에 데이터 전송 (초기 데이터 전송용) */
    public void sendToEmitter(SseEmitter emitter, Object data) {
        try {
            emitter.send(SseEmitter.event().data(data));
        } catch (IOException e) {
            log.debug("SSE 단일 emitter 전송 실패");
        }
    }

    /** 해당 채널의 모든 클라이언트에게 데이터 전송 (실패한 emitter는 일괄 제거) */
    public void broadcast(String channel, Object data) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(channel);
        if (list == null || list.isEmpty()) {
            return;
        }

        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().data(data));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }

        if (!dead.isEmpty()) {
            list.removeAll(dead);
            log.debug("SSE 전송 실패 emitter {}건 제거: channel={}", dead.size(), channel);
        }
    }
}
