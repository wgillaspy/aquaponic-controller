`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 08/13/2020 06:31:11 PM
// Design Name: 
// Module Name: fpga_controller_top
// Project Name: 
// Target Devices: 
// Tool Versions: 
// Description: 
// 
// Dependencies: 
// 
// Revision:
// Revision 0.01 - File Created
// Additional Comments:
// 
//////////////////////////////////////////////////////////////////////////////////


module fpga_controller_top(
    input clk,
    input rst_n,
    output reg [7:0] led,
    input mc_fresh_water_input,
    input mc_pump_on_input,
    input mc_pump_off_input,
    input mc_waste_water_input,
    output reg mc_float_low_indicator,
    output reg mc_float_high_indicator,
    output reg float_valve_low_output,
    input float_valve_low_input,
    output reg float_valve_high_output,
    input float_valve_high_input,
    output reg [1:0] fresh_water_relay,
    output reg [1:0] waste_water_relay,
    output reg [1:0] pump_on_off_relay,
    output reg [1:0] polor_relay
    );
      reg rst;
  
  wire [1-1:0] M_reset_cond_out;
  reg [1-1:0] M_reset_cond_in;
  reset_conditioner_1 reset_cond (
    .clk(clk),
    .in(M_reset_cond_in),
    .out(M_reset_cond_out)
  );
  wire [1-1:0] M_mc_fresh_water_input_conditioned_out;
  reg [1-1:0] M_mc_fresh_water_input_conditioned_in;
  button_conditioner_2 mc_fresh_water_input_conditioned (
    .clk(clk),
    .in(M_mc_fresh_water_input_conditioned_in),
    .out(M_mc_fresh_water_input_conditioned_out)
  );
  wire [1-1:0] M_mc_waste_water_input_conditioned_out;
  reg [1-1:0] M_mc_waste_water_input_conditioned_in;
  button_conditioner_2 mc_waste_water_input_conditioned (
    .clk(clk),
    .in(M_mc_waste_water_input_conditioned_in),
    .out(M_mc_waste_water_input_conditioned_out)
  );
  wire [1-1:0] M_mc_pump_on_input_conditioned_out;
  reg [1-1:0] M_mc_pump_on_input_conditioned_in;
  button_conditioner_2 mc_pump_on_input_conditioned (
    .clk(clk),
    .in(M_mc_pump_on_input_conditioned_in),
    .out(M_mc_pump_on_input_conditioned_out)
  );
  wire [1-1:0] M_mc_pump_off_input_conditioned_out;
  reg [1-1:0] M_mc_pump_off_input_conditioned_in;
  button_conditioner_2 mc_pump_off_input_conditioned (
    .clk(clk),
    .in(M_mc_pump_off_input_conditioned_in),
    .out(M_mc_pump_off_input_conditioned_out)
  );
  wire [1-1:0] M_float_valve_low_input_conditioned_out;
  reg [1-1:0] M_float_valve_low_input_conditioned_in;
  button_conditioner_2 float_valve_low_input_conditioned (
    .clk(clk),
    .in(M_float_valve_low_input_conditioned_in),
    .out(M_float_valve_low_input_conditioned_out)
  );
  wire [1-1:0] M_float_valve_high_input_conditioned_out;
  reg [1-1:0] M_float_valve_high_input_conditioned_in;
  button_conditioner_2 float_valve_high_input_conditioned (
    .clk(clk),
    .in(M_float_valve_high_input_conditioned_in),
    .out(M_float_valve_high_input_conditioned_out)
  );
  wire [1-1:0] M_waiting_pump_on_out;
  reg [1-1:0] M_waiting_pump_on_in;
  pipeline_3 waiting_pump_on (
    .clk(clk),
    .in(M_waiting_pump_on_in),
    .out(M_waiting_pump_on_out)
  );
  
  always @* begin
    M_reset_cond_in = ~rst_n;
    rst = M_reset_cond_out;
    led = 8'h00;
    polor_relay = 8'hff;
    pump_on_off_relay = 8'hff;
    float_valve_low_output = 8'hff;
    float_valve_high_output = 8'hff;
    M_float_valve_low_input_conditioned_in = float_valve_low_input;
    M_float_valve_high_input_conditioned_in = float_valve_high_input;
    led[0+0-:1] = M_float_valve_low_input_conditioned_out;
    led[1+0-:1] = M_float_valve_high_input_conditioned_out;
    mc_float_low_indicator = M_float_valve_low_input_conditioned_out;
    mc_float_high_indicator = M_float_valve_high_input_conditioned_out;
    M_mc_fresh_water_input_conditioned_in = mc_fresh_water_input;
    M_mc_waste_water_input_conditioned_in = mc_waste_water_input;
    if (M_mc_fresh_water_input_conditioned_out | M_float_valve_low_input_conditioned_out) begin
      fresh_water_relay = 8'h00;
    end else begin
      fresh_water_relay = 8'hff;
    end
    waste_water_relay = ~{2'h2{M_mc_waste_water_input_conditioned_out}};
    M_mc_pump_on_input_conditioned_in = mc_pump_on_input;
    M_mc_pump_off_input_conditioned_in = mc_pump_off_input;
    polor_relay = ~{2'h2{M_mc_pump_off_input_conditioned_out}};
    M_waiting_pump_on_in = (M_mc_pump_on_input_conditioned_out | M_mc_pump_off_input_conditioned_out);
    if (M_waiting_pump_on_out) begin
      pump_on_off_relay[0+0-:1] = 8'h00;
      pump_on_off_relay[1+0-:1] = 8'h00;
    end else begin
      pump_on_off_relay[0+0-:1] = 8'hff;
      pump_on_off_relay[1+0-:1] = 8'hff;
    end
  end
endmodule
