# aquaponic-controller

*Currently a trough style hydroponic setup while I work out the hardware and code.  Once the bugs
are fixed and things stabilize, if the space is available, I'll add in some fish.  But right it's
easy enough to grow a decent crop of lettuce with General Hydroponics fertilizer, epsom salt, calcium hydroxide
and some ferrous gluconate iron solution.

This isn't a particularly cheap project to undertake, but the results have been been rewarding.
Fresh, well developed, and bug free lettuce and herbs.  Being in South Carolina, lettuce isn't
one of those things we get to grow well in the summer. Simply too hot.  Now we have a surpus for ourselves
and friends.

As with most of my projects, this one involves a raspberry pi and an arduino.  Adding to the cast
is also a Alchitry Au (which I may regret since I can't seen to find any more to order) and several
Atlas Scientific circuits and probes.  Binding those circuits to the raspberry pi is a whitebox labs
Tentacle T3.

[The full bill of materials is here.](BOM.MD)

I really can't speak highly enough of the Atlas Scientific ecosystem.  With a little looking around
I was able to find enough information to drive the circuits with javascript, pop them into a NodeJs
project and then pop that into a docker container.

I prefer to run ubuntu server on my raspberry pi, so there was some additional configuration
I needed to enable the I2C interface.

If you dig ansible, you can use this block to help figure out how to enable I2C on a ubuntu install.
I've also included the two files that are copied in the root of this project.

```yaml
    - name: Install i2c-tools
      apt:
        name: i2c-tools
        state: present
        update_cache: yes
      become: yes
    - name: Copy modules file.
      copy:
        src: modules
        dest: /etc/modules
        mode: 0644
      become: yes
    - name: Copy the usrcfg.txt to the firmware directory.
      copy:
        src: usercfg.txt
        dest: /boot/firmware/usercfg.txt
        mode: 0655
      become: yes
```

The [parts](parts) directory contains all the .stls and Alibre files that I used to mount things.  Nothing is refined, but all 
the electronics and pumps mount to DIN rails.  The probes and float switches mount to 1"PVC pipes in the sump.

 #### State of the project.
- pH is monitored and adjusted upward with calcium hydroxide solution in tap water.  The clear liquid between the calcium sediment
  and crust is dosed using a Milwaukee Dosing controlled through Home Assistant > Phillips Hue > Smart Plug.
- Electrical Conductivity (EC) is monitored and adjusted upward by dosing diluted General Hydroponic fertilizer with an EZO PMP. 
- A diluted mixture of Magnesium (epsom salt) and Iron (ferrous gluconate) is dosed periodically with an EZO PMP.  Iron and Magnesium are not 
  monitored and are simply added on a set schedule.
  
The configuration is pretty strait forward and [available here](src/main/javascript/probe-reader/configuration.json) 

Probes are easily added to the configuration by adding a new distinct element to the probe object.  If the new probe
needs to run some dosing pump, then a rule can be setup in the dosing section with the same distinct element key.

Dosing pumps that run a schedule can be added to the scheduled section of the configuration.

Again, I can't really speak more highly of the Atlas Scientific ecosystem.  Once the boiler plate has been accomplished, its super easy to add additional functionality.

And as usual, I use splunk to log readings.

The arduino currently only holds the Alchitry pins low, but it will eventually be used to automate the periodic water changes.