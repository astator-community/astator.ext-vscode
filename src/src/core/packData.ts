
export class PackData {
    key: string;
    description: string;
    buffer: Buffer;

    /**
     *
     */
    constructor(key: string, description: string, buffer: Buffer) {
        this.key = key;
        this.description = description;
        this.buffer = buffer;
    }

    public makeBuffer(): Buffer {
        var size = 4 + 4 + 256 + 4 + 256 + 4 + this.buffer.length;
        var buffer = Buffer.alloc(size);
        buffer.writeInt32BE(size - 4);
        buffer.writeInt32BE(this.key.length, 4);
        buffer.write(this.key, 4 + 4);

        buffer.writeInt32BE(this.description.length, 4 + 4 + 256);
        buffer.write(this.description, 4 + 4 + 4 + 256);

        buffer.writeInt32BE(this.buffer.length, 4 + 4 + 4 + 256 + 256);
        this.buffer.copy(buffer, 4 + 4 + 4 + 4 + 256 + 256);

        return buffer;
    }

    public static parse(buffer: Buffer) {
        var keySize = buffer.readInt32BE(0);
        var key = buffer.toString("utf8", 4, 4 + keySize);

        var descSize = buffer.readInt32BE(4 + 256);
        var desc = buffer.toString("utf8", 4 + 256 + 4, 4 + 256 + 4 + descSize);

        var bufferSize = buffer.readInt32BE(4 + 256 + 4 + 256);
        var _buffer = Buffer.alloc(bufferSize);
        buffer.copy(_buffer, 0, 4 + 256 + 4 + 256 + 4, 4 + 256 + 4 + 256 + 4 + bufferSize);

        return new PackData(key, desc, _buffer);
    }

}