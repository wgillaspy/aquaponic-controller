FROM docker.pkg.github.com/wgillaspy/arm64v8-avrdude/arm64v8-avrdude:uno

ENV TZ America/New_York

WORKDIR /usr/app

COPY {{INO}} /usr/app/{{INO}}

CMD ["bash", "/arduino-builder.sh","{{INO}}", "/dev/ino"]
