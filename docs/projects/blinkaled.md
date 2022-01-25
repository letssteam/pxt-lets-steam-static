# Blink a LED

```typescript
forever(function () {
  pins.LED.digitalWrite(true);
  pause(500);
  pins.LED.digitalWrite(false);
  pause(500);
});
```
