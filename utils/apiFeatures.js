class ApiFeature {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }
    filter() {
        //create object which conatin querystring from the requested url
        //url:<hostname>/api/tours?key1[op1]=value1&key2=value2&.....
        //req.query is json object {key1:{op1:value1},key2:value2...}
        const queryObj = { ...this.queryString };

        //for filtering result remove page,sort,limit and field from querystring
		const excludedString = ['page', 'sort', 'limit', 'fields'];
        //iterate on each element of excludeString array and remove it from querystring
        excludedString.forEach(el => delete queryObj[el]);

        //query object contain value in the form of ie. {key:{op:value}}
        //but for filter query mongodb require {key:{$op:value}}
        //so append $ before each operator
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }
    sort() {
        //url format :<hostname>/api/tours?sort=<field1>,<field2>,<field3>...
        //Query.sort function accept argument in field1<space>field2<space>field3.. format
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            //if sorting is not provided in query string, sort all document in descending of createdAt
            this.query = this.query.sort('-createdAt');
        }
        return this;

    }
    limitFields() {
        //url format :<hostname>/api/tours?fields:<field1>,<field2>,<field3>...
        //Query.select function accept argument in field1<space>field2<space>field3.. format
        if (this.queryString.fields) {
            const fieldnames = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fieldnames);
        } else {
            this.query = this.query.select('-__v');
        }
        return this;
    }
    paginate() {
        //url format:  <hostname>/api/tours?page=<page no.>&limit:<no. of record per page>
        const page = this.queryString.page * 1 || 1;//default page set to 1
        const limit = this.queryString.limit * 1 || 100;//default record per page 100
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}
module.exports = ApiFeature;