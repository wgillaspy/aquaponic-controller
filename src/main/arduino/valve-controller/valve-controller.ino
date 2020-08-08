#define READ_DELAY 12000
#define WAIT_DELAY 2000


#define LED  13

#define FRESH_WATER_VALVE  9
#define PUMP_VALVE_ON 8

#define PUMP_VALVE_OFF 7
#define WASTE_WATER_VALVE  6

#define FLOAT_VALVE_HIGH 5
#define FLOAT_VALVE_LOW  4

#define FILL_PIN A0
#define DRAIN_PIN A1
#define ALL_OFF_PIN A3

void setup() {
   pinMode(FRESH_WATER_VALVE, OUTPUT);
   pinMode(PUMP_VALVE_ON,     OUTPUT);
   pinMode(PUMP_VALVE_OFF,    OUTPUT);
   pinMode(WASTE_WATER_VALVE,    OUTPUT);

   pinMode(FLOAT_VALVE_HIGH,    INPUT);
   pinMode(FLOAT_VALVE_LOW,    INPUT);


   pinMode(FILL_PIN,    INPUT);
   pinMode(DRAIN_PIN,    INPUT);

   digitalWrite(FRESH_WATER_VALVE, LOW);
   digitalWrite(PUMP_VALVE_ON,     LOW);
   digitalWrite(PUMP_VALVE_OFF,    LOW);
   digitalWrite(WASTE_WATER_VALVE, LOW);

   digitalWrite(FILL_PIN, LOW);
   digitalWrite(DRAIN_PIN, LOW);
}

void loop() {

  boolean once = false;

//  delay(READ_DELAY);
//  digitalWrite(PUMP_VALVE_OFF, LOW);
//  delay(WAIT_DELAY);
//  digitalWrite(PUMP_VALVE_ON, HIGH);
//  digitalWrite(13, HIGH);
//  delay(READ_DELAY);
//  digitalWrite(PUMP_VALVE_ON, LOW);
//  delay(WAIT_DELAY);
//  digitalWrite(PUMP_VALVE_OFF, HIGH);
//  //digitalWrite(PUMP_VALVE_ON, LOW);
//  //digitalWrite(FRESH_WATER_VALVE, HIGH);
//  digitalWrite(13, LOW);

   delay(WAIT_DELAY);
   digitalWrite(LED, HIGH);

   if (digitalRead(DRAIN_PIN) == HIGH) {

       digitalWrite(PUMP_VALVE_ON, LOW);
       delay(500);
       digitalWrite(PUMP_VALVE_OFF, HIGH);

   } else {
      digitalWrite(FRESH_WATER_VALVE, HIGH);
      digitalWrite(PUMP_VALVE_OFF, LOW);
      delay(500);
      digitalWrite(PUMP_VALVE_ON, HIGH);

   }

//   if (digitalRead(DRAIN_PIN) != HIGH && digitalRead(FILL_PIN) != HIGH) {
//            digitalWrite(PUMP_VALVE_OFF, LOW);
//            delay(500);
//            digitalWrite(PUMP_VALVE_ON, HIGH);
//   }

   delay(WAIT_DELAY);
   digitalWrite(LED, LOW);

//   if (digitalRead(FILL_PIN) == HIGH) {
//      digitalWrite(LED, HIGH);
//      digitalWrite(PUMP_VALVE_ON, HIGH);
//      delay(500);
//      digitalWrite(PUMP_VALVE_OFF, LOW);
//
//   }

}

void waterChange() {


  

    
  
}
